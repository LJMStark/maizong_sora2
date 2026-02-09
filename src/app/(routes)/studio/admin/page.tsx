import AdminPanel from "@/features/studio/components/admin/admin-panel";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "管理后台",
  description: "系统管理后台",
};

export default function AdminPage() {
  return <AdminPanel />;
}
