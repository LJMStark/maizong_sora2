import AssetsGallery from "@/features/studio/components/assets-gallery";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "作品库",
  description: "浏览你的图像和视频作品",
};

export default function AssetsPage() {
  return <AssetsGallery />;
}
