export const XIAOXIAODONG_STORAGE_PREFIX = "gallery/xiaoxiaodong";

export function xiaoxiaodongTopicFileName(topicKey: string) {
  const slug = [...new TextEncoder().encode(topicKey)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 24);
  return `${slug || "topic"}.json`;
}

/**
 * 灵感库目录地址。
 *
 * serverSide=true 时优先用 SUPABASE_INTERNAL_URL：应用与 Supabase 同在
 * Zeabur 上时，容器访问兄弟服务的公网域名会失败（hairpin），必须走内网。
 * 浏览器侧仍然用公网地址。
 */
export function getXiaoxiaodongGalleryBase(serverSide = false) {
  const override = process.env.NEXT_PUBLIC_XIAOXIAODONG_GALLERY_BASE?.replace(
    /\/$/,
    ""
  );
  if (override) return override;

  const internalUrl = serverSide
    ? process.env.SUPABASE_INTERNAL_URL?.replace(/\/$/, "")
    : undefined;
  const supabaseUrl =
    internalUrl || process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
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
