import VideoWorkshop from "@/features/studio/components/video-workshop";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "视频工作室",
  description: "使用小象万象把图片和提示词生成短视频，支持多模型、快速模式和高质量模式",
};

export default function VideoPage() {
  return <VideoWorkshop />;
}
