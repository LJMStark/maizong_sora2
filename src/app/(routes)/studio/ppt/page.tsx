import PptWorkshop from "@/features/studio/components/ppt/ppt-workshop";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PPT 工作室",
  description:
    "在小象万象用 AI 生成整套 PPT：多种热门风格引擎、逐页图像生成、在线预览与多格式导出",
};

export default function StudioPptPage() {
  return <PptWorkshop />;
}
