import ImageWorkshop from "@/features/studio/components/image-workshop";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "图像工作室",
  description: "使用 AI 生成和编辑专业的产品图像，支持多种宽高比和质量选项",
};

export default function StudioPage() {
  return <ImageWorkshop />;
}
