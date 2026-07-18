"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth/client";
import { signOut } from "@/lib/auth/client";
import { isAdmin } from "../../utils/user-helpers";
import {
  ChevronRight,
  Lock,
  Megaphone,
  ReceiptText,
  Settings,
  ShieldCheck,
  Ticket,
  Users,
} from "lucide-react";
import AnnouncementManager from "./announcement-manager";
import UserManager from "./user-manager";
import RedemptionCodeManager from "./redemption-code-manager";
import SettingsManager from "./settings-manager";
import OrderManager from "./order-manager";
import { cn } from "@/lib/utils";
import { useHydrated } from "../../hooks/use-hydrated";
import { openLoginDialog } from "../../utils/studio-events";

const TABS = [
  {
    key: "announcements",
    label: "公告",
    description: "发布站内通知",
    icon: Megaphone,
  },
  {
    key: "orders",
    label: "订单",
    description: "确认付款和发放",
    icon: ReceiptText,
  },
  {
    key: "users",
    label: "用户",
    description: "角色、积分和状态",
    icon: Users,
  },
  {
    key: "codes",
    label: "兑换码",
    description: "生成和停用",
    icon: Ticket,
  },
  {
    key: "settings",
    label: "系统",
    description: "供应商和限额",
    icon: Settings,
  },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function AdminPanel() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("announcements");
  const hydrated = useHydrated();
  const activeTabItem = TABS.find((tab) => tab.key === activeTab) ?? TABS[0];
  const ActiveIcon = activeTabItem.icon;
  const handleSignOut = async () => {
    await signOut();
    router.refresh();
  };

  if (!hydrated || isPending) {
    return (
      <div className="flex h-full items-center justify-center bg-white px-6">
        <div className="w-full max-w-[420px] space-y-3">
          <div className="h-4 w-20 animate-pulse rounded-full bg-[#eeeeee]" />
          <div className="rounded-2xl border border-[#eeeeee] bg-white p-4">
            <div className="flex items-center gap-3">
              <div className="size-10 animate-pulse rounded-full bg-[#f4f4f4]" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-4 w-32 animate-pulse rounded-full bg-[#eeeeee]" />
                <div className="h-3 w-48 animate-pulse rounded-full bg-[#f4f4f4]" />
              </div>
            </div>
          </div>
          <div className="h-10 animate-pulse rounded-full bg-[#f4f4f4]" />
        </div>
      </div>
    );
  }

  if (!session?.user || !isAdmin(session.user)) {
    return (
      <div className="flex h-full items-center justify-center bg-white px-6">
        <div className="w-full max-w-[420px]">
          <div className="rounded-[22px] border border-[#e7e7e7] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <div className="flex items-start gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#f4f4f4] text-[#777]">
                <Lock className="size-5" strokeWidth={1.9} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-normal text-[#8a8a8a]">
                  Admin
                </p>
                <h1 className="mt-1 text-[20px] font-medium leading-7 text-[#0d0d0d]">
                  需要管理员权限
                </h1>
                <p className="mt-2 text-sm leading-6 text-[#777]">
                  {session?.user
                    ? "当前账号没有后台权限。请切换到管理员账号后再进入。"
                    : "登录管理员账号后，可以管理公告、订单、用户和系统设置。"}
                </p>
              </div>
            </div>

            <div className="mt-5 overflow-hidden rounded-xl border border-[#eeeeee] bg-[#fcfcfc]">
              {TABS.slice(0, 4).map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.key}
                    className="flex min-h-11 items-center gap-3 border-b border-[#eeeeee] px-3 last:border-b-0"
                  >
                    <Icon className="size-4 text-[#777]" strokeWidth={1.9} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[#0d0d0d]">
                        {item.label}
                      </p>
                    </div>
                    <ChevronRight className="size-4 text-[#c3c3c3]" strokeWidth={1.9} />
                  </div>
                );
              })}
            </div>

            {session?.user ? (
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <Link
                  href="/studio"
                  className="inline-flex h-10 items-center justify-center rounded-full bg-[#0d0d0d] px-5 text-sm font-medium text-white transition hover:bg-[#333]"
                >
                  返回工作台
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="inline-flex h-10 items-center justify-center rounded-full border border-[#d9d9d9] bg-white px-5 text-sm font-medium text-[#0d0d0d] transition hover:bg-[#f4f4f4]"
                >
                  退出当前账号
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={openLoginDialog}
                className="mt-5 inline-flex h-10 w-full items-center justify-center rounded-full bg-[#0d0d0d] px-5 text-sm font-medium text-white transition hover:bg-[#333]"
              >
                登录
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white text-[#0d0d0d]">
      <div className="custom-scrollbar flex-1 overflow-y-auto bg-white">
        <div className="mx-auto flex w-full max-w-[980px] flex-col px-4 pb-16 pt-5 md:px-6 md:pt-8">
          <div className="sticky top-0 z-20 -mx-4 mb-5 bg-white/95 px-4 py-3 backdrop-blur md:hidden">
            <div className="overflow-x-auto">
              <div className="grid min-w-full grid-cols-5 rounded-full bg-[#f4f4f4] p-1">
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveTab(tab.key)}
                      aria-pressed={activeTab === tab.key}
                      className={cn(
                        "flex h-9 min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-2 text-[13px] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-black/15",
                        activeTab === tab.key
                          ? "bg-white text-[#0d0d0d] shadow-sm"
                          : "text-[#777] hover:text-[#0d0d0d]"
                      )}
                    >
                      <Icon className="size-4" strokeWidth={1.9} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-none bg-white md:grid md:min-h-[min(640px,calc(100vh-112px))] md:grid-cols-[188px_minmax(0,1fr)] md:rounded-[18px] md:border md:border-[#d9d9d9]">
            <aside className="hidden border-r border-[#eeeeee] bg-[#fbfbfb] md:block">
              <div className="sticky top-8 p-2">
                <div className="px-3 pb-3 pt-3">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-4 text-[#555]" strokeWidth={1.9} />
                    <h1 className="text-xl font-medium leading-tight text-[#0d0d0d]">
                      管理
                    </h1>
                  </div>
                </div>
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  const selected = activeTab === tab.key;

                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveTab(tab.key)}
                      aria-current={selected ? "page" : undefined}
                      className={cn(
                        "flex h-10 w-full items-center gap-2 rounded-lg px-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-black/15",
                        selected
                          ? "bg-[#ececec] text-[#0d0d0d]"
                          : "text-[#777] hover:bg-black/[0.04] hover:text-[#0d0d0d]"
                      )}
                    >
                      <Icon className="size-4 shrink-0" strokeWidth={1.9} />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">
                          {tab.label}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </aside>

            <main className="min-w-0 md:px-6 md:py-6">
              <div className="mb-5 flex items-start gap-3">
                <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-[#f4f4f4] text-[#555]">
                  <ActiveIcon className="size-4" strokeWidth={1.9} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-xl font-medium text-[#0d0d0d]">
                    {activeTabItem.label}
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-[#777]">
                    {activeTabItem.description}
                  </p>
                </div>
              </div>

              {activeTab === "announcements" && <AnnouncementManager />}
              {activeTab === "orders" && <OrderManager />}
              {activeTab === "users" && <UserManager />}
              {activeTab === "codes" && <RedemptionCodeManager />}
              {activeTab === "settings" && <SettingsManager />}
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
