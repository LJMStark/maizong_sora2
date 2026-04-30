"use client";

import { useState } from "react";
import { useSession } from "@/lib/auth/client";
import { isAdmin } from "../../utils/user-helpers";
import { Lock, Megaphone, ReceiptText, Settings, Ticket, Users } from "lucide-react";
import AnnouncementManager from "./announcement-manager";
import UserManager from "./user-manager";
import RedemptionCodeManager from "./redemption-code-manager";
import SettingsManager from "./settings-manager";
import OrderManager from "./order-manager";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "announcements", label: "公告管理", icon: Megaphone },
  { key: "orders", label: "订单管理", icon: ReceiptText },
  { key: "users", label: "用户管理", icon: Users },
  { key: "codes", label: "兑换码", icon: Ticket },
  { key: "settings", label: "系统设置", icon: Settings },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function AdminPanel() {
  const { data: session, isPending } = useSession();
  const [activeTab, setActiveTab] = useState<TabKey>("announcements");

  if (isPending) {
    return (
      <div className="flex h-full items-center justify-center bg-white">
        <div className="animate-pulse text-[#777]">加载中...</div>
      </div>
    );
  }

  if (!session?.user || !isAdmin(session.user)) {
    return (
      <div className="flex h-full items-center justify-center bg-white">
        <div className="text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-[#f0f0f0] text-[#777]">
            <Lock className="size-7" strokeWidth={1.9} />
          </div>
          <p className="mt-4 text-[#777]">需要管理员权限</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white text-[#0d0d0d]">
      <div className="shrink-0 border-b border-[#e5e5e5] bg-white px-5 py-4 md:px-8">
        <h1 className="mb-4 text-[22px] font-medium leading-none text-[#0d0d0d]">
          管理后台
        </h1>
        <div className="overflow-x-auto">
          <div className="flex w-max rounded-full bg-[#f0f0f0] p-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "flex h-10 items-center gap-2 whitespace-nowrap rounded-full px-4 text-[15px] transition",
                    activeTab === tab.key
                      ? "bg-white text-[#0d0d0d] shadow-sm"
                      : "text-[#777] hover:text-[#0d0d0d]"
                  )}
                >
                  <Icon className="size-4" strokeWidth={1.9} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-white px-5 py-6 md:px-8">
        {activeTab === "announcements" && <AnnouncementManager />}
        {activeTab === "orders" && <OrderManager />}
        {activeTab === "users" && <UserManager />}
        {activeTab === "codes" && <RedemptionCodeManager />}
        {activeTab === "settings" && <SettingsManager />}
      </div>
    </div>
  );
}
