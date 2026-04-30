import ImageWorkshop from "@/features/studio/components/image-workshop";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "图像工作室",
  description: "在小象万象生成、编辑商品图和创意图，支持多模型、提示词模板和多种画幅",
};

export default function StudioPage() {
  return <ImageWorkshop />;
}
