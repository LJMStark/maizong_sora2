import { createClient, SupabaseClient } from "@supabase/supabase-js";

const BUCKET_NAME = "studio-assets";

let supabaseClient: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!supabaseClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase environment variables are not configured");
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
      throw new Error(`Failed to upload image: ${error.message}`);
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

    const response = await fetch(videoUrl);

    if (!response.ok) {
      throw new Error(`Failed to fetch video from URL: ${response.status}`);
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
      throw new Error(`Failed to upload video: ${error.message}`);
    }

    const {
      data: { publicUrl },
    } = getSupabase().storage.from(BUCKET_NAME).getPublicUrl(path);

    return publicUrl;
  },

  async deleteFile(path: string): Promise<void> {
    const { error } = await getSupabase().storage.from(BUCKET_NAME).remove([path]);

    if (error) {
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  },

  getPublicUrl(path: string): string {
    const {
      data: { publicUrl },
    } = getSupabase().storage.from(BUCKET_NAME).getPublicUrl(path);
    return publicUrl;
  },
};
