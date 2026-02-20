import UserCenter from "@/features/studio/components/user-center";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "用户中心",
  description: "管理积分钱包、兑换码和账户设置",
};

export default function ProfilePage() {
  return <UserCenter />;
}
