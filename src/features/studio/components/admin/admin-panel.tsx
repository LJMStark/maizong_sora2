"use client";

import { useState } from "react";
import { useSession } from "@/lib/auth/client";
import { isAdmin } from "../../utils/user-helpers";
import AnnouncementManager from "./announcement-manager";
import UserManager from "./user-manager";
import RedemptionCodeManager from "./redemption-code-manager";
import SettingsManager from "./settings-manager";

const TABS = [
  { key: "announcements", label: "公告管理", icon: "campaign" },
  { key: "users", label: "用户管理", icon: "group" },
  { key: "codes", label: "兑换码", icon: "confirmation_number" },
  { key: "settings", label: "系统设置", icon: "settings" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function AdminPanel() {
  const { data: session, isPending } = useSession();
  const [activeTab, setActiveTab] = useState<TabKey>("announcements");

  if (isPending) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-[#4b5563]">加载中...</div>
      </div>
    );
  }

  if (!session?.user || !isAdmin(session.user)) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <span className="material-symbols-outlined text-5xl text-[#d1d5db]">lock</span>
          <p className="mt-4 text-[#4b5563]">需要管理员权限</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="border-b border-[#e5e5e1] bg-white px-6 pt-6 pb-0 shrink-0">
        <h1 className="text-xl font-semibold text-[#1a1a1a] mb-4">管理后台</h1>
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? "text-[#1a1a1a] bg-[#faf9f6] border border-[#e5e5e1] border-b-[#faf9f6] -mb-px"
                  : "text-[#4b5563] hover:text-[#1a1a1a] hover:bg-[#faf9f6]/50"
              }`}
            >
              <span className="material-symbols-outlined text-lg">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-[#faf9f6] p-6">
        {activeTab === "announcements" && <AnnouncementManager />}
        {activeTab === "users" && <UserManager />}
        {activeTab === "codes" && <RedemptionCodeManager />}
        {activeTab === "settings" && <SettingsManager />}
      </div>
    </div>
  );
}
