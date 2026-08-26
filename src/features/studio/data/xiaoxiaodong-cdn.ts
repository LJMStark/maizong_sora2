export const XIAOXIAODONG_STORAGE_PREFIX = "gallery/xiaoxiaodong";

export function xiaoxiaodongTopicFileName(topicKey: string) {
  const slug = [...new TextEncoder().encode(topicKey)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 24);
  return `${slug || "topic"}.json`;
}

export function getXiaoxiaodongGalleryBase() {
  const override = process.env.NEXT_PUBLIC_XIAOXIAODONG_GALLERY_BASE?.replace(
    /\/$/,
    ""
  );
  if (override) return override;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (!supabaseUrl) return "";

  return `${supabaseUrl}/storage/v1/object/public/studio-assets/${XIAOXIAODONG_STORAGE_PREFIX}`;
}

export interface XiaoxiaodongGalleryCard {
  id: string;
  title: string;
  category: string;
  prompt: string;
  image: string;
}

export interface XiaoxiaodongGalleryTopic {
  key: string;
  label: string;
  count: number;
}

export interface XiaoxiaodongGalleryIndex {
  version: number;
  generatedAt: string;
  featured: XiaoxiaodongGalleryCard[];
  topics: XiaoxiaodongGalleryTopic[];
}

export interface XiaoxiaodongGalleryTopicFile {
  key: string;
  label: string;
  items: XiaoxiaodongGalleryCard[];
}
