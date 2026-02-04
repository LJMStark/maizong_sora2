import Subscription from "@/features/studio/components/subscription";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "订阅",
  description: "查看和管理您的订阅计划，获取更多积分和功能",
};

export default function SubscriptionPage() {
  return <Subscription />;
}
