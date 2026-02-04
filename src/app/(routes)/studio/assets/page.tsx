import UserCenter from "@/features/studio/components/user-center";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "作品集",
  description: "管理您的图像和视频资产，查看积分历史和任务状态",
};

export default function AssetsPage() {
  return <UserCenter />;
}
