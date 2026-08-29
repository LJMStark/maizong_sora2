import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { fetchPublicResource } from "@/lib/security/ssrf";

const BUCKET_NAME = "studio-assets";

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

let supabaseClient: SupabaseClient | null = null;

// 进程内只验证一次 bucket 是否存在，避免每次上传都调用 listBuckets()。
// 仅在创建失败时重置，以便下次上传重新验证。
let bucketVerified = false;

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
      const { error } = await getSupabase().storage.createBucket(BUCKET_NAME, {
        public: true,
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

    const {
      data: { publicUrl },
    } = getSupabase().storage.from(BUCKET_NAME).getPublicUrl(path);

    return publicUrl;
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

    const {
      data: { publicUrl },
    } = getSupabase().storage.from(BUCKET_NAME).getPublicUrl(path);

    return publicUrl;
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

    const {
      data: { publicUrl },
    } = getSupabase().storage.from(BUCKET_NAME).getPublicUrl(path);

    return publicUrl;
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

    const {
      data: { publicUrl },
    } = getSupabase().storage.from(BUCKET_NAME).getPublicUrl(path);

    return publicUrl;
  },

  async deleteFile(path: string): Promise<void> {
    const { error } = await getSupabase().storage.from(BUCKET_NAME).remove([path]);

    if (error) {
      throw new Error(`删除文件失败: ${error.message}`);
    }
  },

  getPublicUrl(path: string): string {
    const {
      data: { publicUrl },
    } = getSupabase().storage.from(BUCKET_NAME).getPublicUrl(path);
    return publicUrl;
  },
};
