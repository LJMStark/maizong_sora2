import { createClient, SupabaseClient } from "@supabase/supabase-js";

const BUCKET_NAME = "studio-assets";

let supabaseClient: SupabaseClient | null = null;

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
    const { data: buckets } = await getSupabase().storage.listBuckets();
    const bucketExists = buckets?.some((b) => b.name === BUCKET_NAME);

    if (!bucketExists) {
      await getSupabase().storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: 104857600,
      });
    }
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
    
    // SSRF Check
    const { validateUrl } = await import("@/lib/security/ssrf");
    validateUrl(videoUrl);

    const response = await fetch(videoUrl);

    if (!response.ok) {
      throw new Error(`从 URL 获取视频失败: ${response.status}`);
    }

    const videoBuffer = Buffer.from(await response.arrayBuffer());
    const path = `users/${userId}/videos/${taskId}.mp4`;

    const { error } = await getSupabase().storage
      .from(BUCKET_NAME)
      .upload(path, videoBuffer, {
        contentType: "video/mp4",
        upsert: true,
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

    // SSRF Check
    const { validateUrl } = await import("@/lib/security/ssrf");
    validateUrl(imageUrl);

    const response = await fetch(imageUrl);

    if (!response.ok) {
      throw new Error(`从 URL 获取图片失败: ${response.status}`);
    }

    const contentType = response.headers.get("content-type") || "image/png";
    const extension = contentType.split("/")[1] || "png";
    const imageBuffer = Buffer.from(await response.arrayBuffer());
    const path = `users/${userId}/images/${taskId}.${extension}`;

    const { error } = await getSupabase().storage
      .from(BUCKET_NAME)
      .upload(path, imageBuffer, {
        contentType,
        upsert: true,
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
