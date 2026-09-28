import {
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import sharp from "sharp";
import { fetchPublicResource } from "@/lib/security/ssrf";
import {
  isTransformableImagePath,
  THUMBNAIL_TRANSFORM,
  thumbnailPathOf,
} from "./storage-transform";

// 用户作品存放在 Cloudflare R2 的私有桶，只能通过服务端签发的限时链接访问。
// 灵感库等公开素材在另一个公开桶（见 xiaoxiaodong-cdn.ts），两类内容分桶
// 才能同时满足「用户作品要私密」和「灵感库要公开」。
function getUserAssetsBucket(): string {
  return process.env.R2_USER_ASSETS_BUCKET || "sora2-user-assets";
}

// 迁到 R2 之前，对象存放在 Supabase Storage。库里仍有指向那里的完整 URL
// （studio-user-assets 私有桶，以及更早的公开桶 studio-assets），迁移时对象
// 已按相同路径复制到 R2，反解路径时需要一并识别。
const SUPABASE_BUCKET_NAME = "studio-user-assets";
const LEGACY_BUCKET_NAME = "studio-assets";

// 上传路径都带时间戳/taskId、内容写入后不再变化，缓存一年。
const IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable";

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

let s3Client: S3Client | null = null;

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
      `/storage/v1/object/(?:public|sign)/(${SUPABASE_BUCKET_NAME}|${LEGACY_BUCKET_NAME})/(.+)$`
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

function getS3(): S3Client {
  if (!s3Client) {
    const endpoint = process.env.R2_ENDPOINT;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

    if (!endpoint || !accessKeyId || !secretAccessKey) {
      throw new Error("R2 环境变量未配置");
    }

    s3Client = new S3Client({
      region: "auto",
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  return s3Client;
}

function signGetUrl(path: string, ttlSeconds: number): Promise<string> {
  return getSignedUrl(
    getS3(),
    new GetObjectCommand({ Bucket: getUserAssetsBucket(), Key: path }),
    { expiresIn: ttlSeconds }
  );
}

async function objectExists(path: string): Promise<boolean> {
  try {
    await getS3().send(
      new HeadObjectCommand({ Bucket: getUserAssetsBucket(), Key: path })
    );
    return true;
  } catch {
    return false;
  }
}

async function putObject(path: string, body: Buffer, contentType: string): Promise<void> {
  await getS3().send(
    new PutObjectCommand({
      Bucket: getUserAssetsBucket(),
      Key: path,
      Body: body,
      ContentType: contentType,
      CacheControl: IMMUTABLE_CACHE_CONTROL,
    })
  );
}

/**
 * 为位图生成并上传缩略图（参数见 storage-transform.ts）。
 * 失败不影响原图：列表接口拿不到缩略图时会回落到原图。
 */
async function putThumbnail(path: string, image: Buffer): Promise<void> {
  if (!isTransformableImagePath(path)) return;
  try {
    const thumbnail = await sharp(image)
      .rotate()
      .resize({ width: THUMBNAIL_TRANSFORM.width, withoutEnlargement: true })
      .webp({ quality: THUMBNAIL_TRANSFORM.quality })
      .toBuffer();
    await putObject(thumbnailPathOf(path), thumbnail, "image/webp");
  } catch (error) {
    console.warn("[Storage] 生成缩略图失败，列表将回落原图:", { path, error });
  }
}

async function uploadWithThumbnail(
  path: string,
  body: Buffer,
  contentType: string
): Promise<void> {
  await putObject(path, body, contentType);
  await putThumbnail(path, body);
}

export const storageService = {
  /**
   * 桶由部署时预先创建（Cloudflare R2 控制台），应用令牌只有对象读写权限，
   * 无权也无须在运行时建桶。保留该方法以兼容调用方。
   */
  async ensureBucketExists(): Promise<void> {},

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

    try {
      return await signGetUrl(path, ttlSeconds);
    } catch (error) {
      console.error("[Storage] 生成签名链接失败:", { path, error });
      return null;
    }
  },

  /** 供外部 AI 拉取的源图链接，有效期更长 */
  async resolveProviderAssetUrl(
    stored: string | null | undefined
  ): Promise<string | null> {
    return this.resolveAssetUrl(stored, PROVIDER_SIGNED_URL_TTL_SECONDS);
  },

  /**
   * 批量签发。预签名在本地计算、不产生网络往返，去重后逐个签即可。
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
    await Promise.all(
      uniquePaths.map(async (path) => {
        try {
          signedByPath.set(path, await signGetUrl(path, ttlSeconds));
        } catch (error) {
          console.error("[Storage] 批量生成签名链接失败:", { path, error });
        }
      })
    );

    return storedValues.map((value, index) => {
      const path = paths[index];
      // 非本仓库对象（provider 自己的地址）原样返回
      if (path === null) return value ?? null;
      return signedByPath.get(path) ?? null;
    });
  },

  /**
   * 批量签发**缩略图**链接：与 resolveAssetUrls 相同的入参/返回约定，
   * 签的是上传时预生成的 WebP 缩略图（见 storage-transform.ts）。
   *
   * 非图片、以及缩略图不存在（例如迁移前上传、或当时生成失败）的一律返回
   * null，由调用方回落到原图链接——宁可多下载一次，也不要给出一个渲染时
   * 才 404 的地址。存在性检查去重后并发，一屏几十张的开销约等于一次往返。
   */
  async resolveThumbnailUrls(
    storedValues: (string | null | undefined)[],
    ttlSeconds: number = SIGNED_URL_TTL_SECONDS
  ): Promise<(string | null)[]> {
    const paths = storedValues.map((value) => {
      if (!value) return null;
      const path = toStoragePath(value);
      return path && isTransformableImagePath(path) ? path : null;
    });

    const uniquePaths = Array.from(
      new Set(paths.filter((path): path is string => path !== null))
    );

    if (uniquePaths.length === 0) {
      return storedValues.map(() => null);
    }

    const signedByPath = new Map<string, string>();

    await Promise.all(
      uniquePaths.map(async (path) => {
        const thumbnailPath = thumbnailPathOf(path);
        try {
          if (!(await objectExists(thumbnailPath))) return;
          signedByPath.set(path, await signGetUrl(thumbnailPath, ttlSeconds));
        } catch (error) {
          // 不算失败：调用方回落到原图，只是这一张没省下带宽
          console.warn("[Storage] 生成缩略图链接失败，回落原图:", { path, error });
        }
      })
    );

    return paths.map((path) => (path ? signedByPath.get(path) ?? null : null));
  },

  async uploadImage(
    userId: string,
    file: Buffer,
    filename: string,
    contentType: string
  ): Promise<string> {
    if (file.byteLength > MAX_UPLOAD_BYTES) {
      throw new Error("上传图片失败: 文件超过大小上限");
    }

    const timestamp = Date.now();
    const path = `users/${userId}/images/${timestamp}-${filename}`;

    try {
      await uploadWithThumbnail(path, file, contentType);
    } catch (error) {
      throw new Error(`上传图片失败: ${error instanceof Error ? error.message : String(error)}`);
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
    // SSRF/大小/超时受控下载
    const { buffer } = await fetchPublicResource(videoUrl, {
      maxBytes: MAX_REMOTE_VIDEO_BYTES,
      timeoutMs: REMOTE_VIDEO_TIMEOUT_MS,
    });

    const path = `users/${userId}/videos/${taskId}.mp4`;

    try {
      await putObject(path, buffer, "video/mp4");
    } catch (error) {
      throw new Error(`上传视频失败: ${error instanceof Error ? error.message : String(error)}`);
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
    // SSRF/大小/超时受控下载
    const { buffer, contentType } = await fetchPublicResource(imageUrl, {
      maxBytes: MAX_REMOTE_IMAGE_BYTES,
      timeoutMs: REMOTE_IMAGE_TIMEOUT_MS,
    });

    const extension = imageExtensionOf(contentType);
    const path = `users/${userId}/images/${taskId}.${extension}`;

    try {
      await uploadWithThumbnail(path, buffer, contentType || "image/png");
    } catch (error) {
      throw new Error(`上传图片失败: ${error instanceof Error ? error.message : String(error)}`);
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
    // SSRF/大小/超时受控下载
    const { buffer, contentType } = await fetchPublicResource(imageUrl, {
      maxBytes: MAX_REMOTE_IMAGE_BYTES,
      timeoutMs: REMOTE_IMAGE_TIMEOUT_MS,
    });

    const extension = imageExtensionOf(contentType);
    const path = `users/${userId}/ppt/${taskId}/${slideIndex}.${extension}`;

    try {
      await uploadWithThumbnail(path, buffer, contentType || "image/png");
    } catch (error) {
      throw new Error(`上传图片失败: ${error instanceof Error ? error.message : String(error)}`);
    }

    // 返回 bucket 内路径而非 URL：bucket 是私有的，访问链接由
    // resolveAssetUrl 在读取时按需签发
    return path;
  },

  /** 删除对象，连同它的缩略图（不存在时 R2 同样返回成功） */
  async deleteFile(path: string): Promise<void> {
    try {
      const result = await getS3().send(
        new DeleteObjectsCommand({
          Bucket: getUserAssetsBucket(),
          Delete: { Objects: [{ Key: path }, { Key: thumbnailPathOf(path) }] },
        })
      );
      if (result.Errors?.length) {
        throw new Error(result.Errors.map((e) => e.Message).join("; "));
      }
    } catch (error) {
      throw new Error(`删除文件失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
};
