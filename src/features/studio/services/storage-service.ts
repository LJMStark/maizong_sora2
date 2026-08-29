import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { fetchPublicResource } from "@/lib/security/ssrf";

// 用户作品桶：私有，只能通过服务端签发的限时链接访问。
// 与公开的 studio-assets 分开——后者装的是灵感库等公开素材，
// 数量上占绝大多数且本就该匿名可读，两类内容混在一个桶里
// 无法同时满足「用户作品要私密」和「灵感库要公开」。
const BUCKET_NAME = "studio-user-assets";

// 历史上用户作品曾与公开素材同处 studio-assets，库里仍有指向它的
// 完整 URL，反解路径时需要一并识别。
const LEGACY_BUCKET_NAME = "studio-assets";

// 上传路径都带时间戳/taskId、内容写入后不再变化，
// 让 Supabase CDN 缓存一年（默认仅 3600 秒）。
const IMMUTABLE_CACHE_SECONDS = "31536000";

// Hard ceiling for objects in the shared bucket. Holds both user images and
// provider-fetched videos, so sized for the larger video case. Per-request
// image limits are enforced upstream at the API boundary.
const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

// 从 provider 拉取远程资源的限制（防内存耗尽/慢速攻击）
const MAX_REMOTE_VIDEO_BYTES = MAX_UPLOAD_BYTES;
const MAX_REMOTE_IMAGE_BYTES = 30 * 1024 * 1024;
const REMOTE_VIDEO_TIMEOUT_MS = 120_000;
const REMOTE_IMAGE_TIMEOUT_MS = 60_000;

// 由 content-type 推导存储扩展名（白名单，防注入怪异扩展名）
const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

function imageExtensionOf(contentType: string | null): string {
  if (!contentType) return "png";
  return IMAGE_EXTENSIONS[contentType.split(";")[0].trim().toLowerCase()] ?? "png";
}

// 签名 URL 有效期。
// 展示用：客户端会频繁重新拉取任务列表，1 小时足够且过期风险低。
// provider 用：外部 AI 拉取源图可能发生在排队之后，给足冗余；
// 重试路径会用库里的 path 重新签名，不依赖旧链接。
const SIGNED_URL_TTL_SECONDS = 60 * 60;
const PROVIDER_SIGNED_URL_TTL_SECONDS = 6 * 60 * 60;

let supabaseClient: SupabaseClient | null = null;

// 进程内只验证一次 bucket 是否存在，避免每次上传都调用 listBuckets()。
// 仅在创建失败时重置，以便下次上传重新验证。
let bucketVerified = false;

function getSupabaseHost(): string {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "").host;
  } catch {
    return "";
  }
}

/**
 * 把数据库里存的值归一成 bucket 内的对象路径。
 *
 * 历史数据存的是完整的公开 URL（.../object/public/studio-assets/<path>），
 * bucket 转私有后这些 URL 会失效，所以这里把它们反解回 path。
 * 新数据直接存 path。
 *
 * 返回 null 表示"这不是我们仓库里的对象"——例如 provider 自己的图片/
 * 视频地址（上传失败时会回落使用），这类地址必须原样返回，不能去签名。
 */
export function toStoragePath(stored: string | null | undefined): string | null {
  if (!stored) return null;

  if (!stored.startsWith("http://") && !stored.startsWith("https://")) {
    return stored.replace(/^\/+/, "");
  }

  let url: URL;
  try {
    url = new URL(stored);
  } catch {
    return null;
  }

  const supabaseHost = getSupabaseHost();
  if (!supabaseHost || url.host !== supabaseHost) return null;

  // /storage/v1/object/public/<bucket>/<path> 或 .../object/sign/<bucket>/<path>
  const match = url.pathname.match(
    new RegExp(
      `/storage/v1/object/(?:public|sign)/(${BUCKET_NAME}|${LEGACY_BUCKET_NAME})/(.+)$`
    )
  );
  if (!match) return null;

  const path = decodeURIComponent(match[2]);

  // 旧桶里只有 users/ 前缀属于用户作品；gallery/ 等公开素材仍留在
  // 公开桶，必须原样返回，不能当成私有对象去签名
  if (match[1] === LEGACY_BUCKET_NAME && !path.startsWith("users/")) {
    return null;
  }

  return path;
}

function getSupabase(): SupabaseClient {
  if (!supabaseClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase 环境变量未配置");
    }

    supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
  }
  return supabaseClient;
}

export const storageService = {
  async ensureBucketExists(): Promise<void> {
    if (bucketVerified) return;

    const { data: buckets } = await getSupabase().storage.listBuckets();
    const bucketExists = buckets?.some((b) => b.name === BUCKET_NAME);

    if (!bucketExists) {
      // 私有 bucket：用户作品只能通过服务端签发的限时链接访问，
      // 拿到裸地址无法直接读取
      const { error } = await getSupabase().storage.createBucket(BUCKET_NAME, {
        public: false,
        fileSizeLimit: MAX_UPLOAD_BYTES,
      });

      if (error) {
        // 创建失败，保持未验证状态，下次上传时重新检查
        bucketVerified = false;
        return;
      }
    }

    bucketVerified = true;
  },

  /**
   * 为存储对象签发限时访问链接。
   * 传入值可以是 path，也可以是历史遗留的完整公开 URL。
   * 非本仓库对象（如 provider 自己的地址）原样返回。
   */
  async resolveAssetUrl(
    stored: string | null | undefined,
    ttlSeconds: number = SIGNED_URL_TTL_SECONDS
  ): Promise<string | null> {
    if (!stored) return null;

    const path = toStoragePath(stored);
    if (!path) return stored;

    const { data, error } = await getSupabase()
      .storage.from(BUCKET_NAME)
      .createSignedUrl(path, ttlSeconds);

    if (error || !data?.signedUrl) {
      console.error("[Storage] 生成签名链接失败:", { path, error });
      return null;
    }

    return data.signedUrl;
  },

  /** 供外部 AI 拉取的源图链接，有效期更长 */
  async resolveProviderAssetUrl(
    stored: string | null | undefined
  ): Promise<string | null> {
    return this.resolveAssetUrl(stored, PROVIDER_SIGNED_URL_TTL_SECONDS);
  },

  /**
   * 批量签发。列表接口一次要解析几十个地址，逐个调用会产生同样多次
   * 网络往返，这里去重后用一次 createSignedUrls 解决。
   * 返回值与入参一一对应。
   */
  async resolveAssetUrls(
    storedValues: (string | null | undefined)[],
    ttlSeconds: number = SIGNED_URL_TTL_SECONDS
  ): Promise<(string | null)[]> {
    const paths = storedValues.map((value) =>
      value ? toStoragePath(value) : null
    );

    const uniquePaths = Array.from(
      new Set(paths.filter((path): path is string => path !== null))
    );

    if (uniquePaths.length === 0) {
      return storedValues.map((value) => value ?? null);
    }

    const signedByPath = new Map<string, string>();
    const { data, error } = await getSupabase()
      .storage.from(BUCKET_NAME)
      .createSignedUrls(uniquePaths, ttlSeconds);

    if (error) {
      console.error("[Storage] 批量生成签名链接失败:", error);
    }

    for (const item of data ?? []) {
      if (item.path && item.signedUrl) {
        signedByPath.set(item.path, item.signedUrl);
      }
    }

    return storedValues.map((value, index) => {
      const path = paths[index];
      // 非本仓库对象（provider 自己的地址）原样返回
      if (path === null) return value ?? null;
      return signedByPath.get(path) ?? null;
    });
  },

  async uploadImage(
    userId: string,
    file: Buffer,
    filename: string,
    contentType: string
  ): Promise<string> {
    await this.ensureBucketExists();

    const timestamp = Date.now();
    const path = `users/${userId}/images/${timestamp}-${filename}`;

    const { error } = await getSupabase().storage
      .from(BUCKET_NAME)
      .upload(path, file, {
        contentType,
        upsert: false,
        cacheControl: IMMUTABLE_CACHE_SECONDS,
      });

    if (error) {
      throw new Error(`上传图片失败: ${error.message}`);
    }

    // 返回 bucket 内路径而非 URL：bucket 是私有的，访问链接由
    // resolveAssetUrl 在读取时按需签发
    return path;
  },

  async uploadVideoFromUrl(
    userId: string,
    taskId: string,
    videoUrl: string
  ): Promise<string> {
    await this.ensureBucketExists();

    // SSRF/大小/超时受控下载
    const { buffer } = await fetchPublicResource(videoUrl, {
      maxBytes: MAX_REMOTE_VIDEO_BYTES,
      timeoutMs: REMOTE_VIDEO_TIMEOUT_MS,
    });

    const path = `users/${userId}/videos/${taskId}.mp4`;

    const { error } = await getSupabase().storage
      .from(BUCKET_NAME)
      .upload(path, buffer, {
        contentType: "video/mp4",
        upsert: true,
        cacheControl: IMMUTABLE_CACHE_SECONDS,
      });

    if (error) {
      throw new Error(`上传视频失败: ${error.message}`);
    }

    // 返回 bucket 内路径而非 URL：bucket 是私有的，访问链接由
    // resolveAssetUrl 在读取时按需签发
    return path;
  },

  async uploadImageFromUrl(
    userId: string,
    taskId: string,
    imageUrl: string
  ): Promise<string> {
    await this.ensureBucketExists();

    // SSRF/大小/超时受控下载
    const { buffer, contentType } = await fetchPublicResource(imageUrl, {
      maxBytes: MAX_REMOTE_IMAGE_BYTES,
      timeoutMs: REMOTE_IMAGE_TIMEOUT_MS,
    });

    const extension = imageExtensionOf(contentType);
    const path = `users/${userId}/images/${taskId}.${extension}`;

    const { error } = await getSupabase().storage
      .from(BUCKET_NAME)
      .upload(path, buffer, {
        contentType: contentType || "image/png",
        upsert: true,
        cacheControl: IMMUTABLE_CACHE_SECONDS,
      });

    if (error) {
      throw new Error(`上传图片失败: ${error.message}`);
    }

    // 返回 bucket 内路径而非 URL：bucket 是私有的，访问链接由
    // resolveAssetUrl 在读取时按需签发
    return path;
  },

  async uploadPptSlideFromUrl(
    userId: string,
    taskId: string,
    slideIndex: number,
    imageUrl: string
  ): Promise<string> {
    await this.ensureBucketExists();

    // SSRF/大小/超时受控下载
    const { buffer, contentType } = await fetchPublicResource(imageUrl, {
      maxBytes: MAX_REMOTE_IMAGE_BYTES,
      timeoutMs: REMOTE_IMAGE_TIMEOUT_MS,
    });

    const extension = imageExtensionOf(contentType);
    const path = `users/${userId}/ppt/${taskId}/${slideIndex}.${extension}`;

    const { error } = await getSupabase().storage
      .from(BUCKET_NAME)
      .upload(path, buffer, {
        contentType: contentType || "image/png",
        upsert: true,
        cacheControl: IMMUTABLE_CACHE_SECONDS,
      });

    if (error) {
      throw new Error(`上传图片失败: ${error.message}`);
    }

    // 返回 bucket 内路径而非 URL：bucket 是私有的，访问链接由
    // resolveAssetUrl 在读取时按需签发
    return path;
  },

  async deleteFile(path: string): Promise<void> {
    const { error } = await getSupabase().storage.from(BUCKET_NAME).remove([path]);

    if (error) {
      throw new Error(`删除文件失败: ${error.message}`);
    }
  },
};
