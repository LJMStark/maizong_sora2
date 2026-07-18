"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  ArrowRight,
  Bell,
  CalendarDays,
  ChevronRight,
  CreditCard,
  Database,
  Download,
  Gift,
  History,
  LogIn,
  Mail,
  ShieldCheck,
  Sparkles,
  Trash2,
  User,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useStudio } from "../context/studio-context";
import { useSession } from "@/lib/auth/client";
import { isAdmin as checkIsAdmin } from "../utils/user-helpers";
import { cn } from "@/lib/utils";
import { exportStudioData } from "../utils/studio-data-export";
import { useHydrated } from "../hooks/use-hydrated";
import {
  dispatchStudioEvent,
  openLoginDialog,
  STUDIO_LOCAL_VIEW_CLEARED_EVENT,
} from "../utils/studio-events";
import { SettingsSwitch } from "./shared/settings-controls";
import {
  getBooleanPreferenceFromEvent,
  getLanguagePreferenceFromEvent,
  readBooleanPreference,
  readLanguagePreference,
  STUDIO_HISTORY_ENABLED_KEY,
  STUDIO_NOTIFICATIONS_ENABLED_KEY,
  STUDIO_PREFERENCES_CHANGED_EVENT,
  type StudioLanguagePreference,
  writeBooleanPreference,
} from "../utils/studio-preferences";

type SettingsSection = "account" | "credits" | "data" | "admin";
type SettingsIcon = React.ElementType;

interface SettingsSectionItem {
  id: SettingsSection;
  label: string;
  description: string;
  icon: SettingsIcon;
}

function SettingsRow({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: SettingsIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[54px] items-center gap-3 px-4 py-3">
      <Icon className="size-[18px] shrink-0 text-[#777]" strokeWidth={1.9} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-[#0d0d0d]">{title}</p>
        <p className="mt-0.5 text-sm leading-5 text-[#777]">{description}</p>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

function RowDivider() {
  return <div className="h-px bg-[#eeeeee]" />;
}

function SmallButton({
  children,
  onClick,
  href,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
}) {
  const className =
    "inline-flex h-8 items-center justify-center rounded-full bg-[#0d0d0d] px-3.5 text-sm font-medium text-white transition hover:bg-[#333]";

  if (href) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {children}
    </button>
  );
}

function SettingsGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <p className="mb-2 px-1 text-xs font-medium text-[#8a8a8a]">{label}</p>
      <div className="overflow-hidden rounded-xl border border-[#e7e7e7] bg-white">
        {children}
      </div>
    </section>
  );
}

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-4">
      <h2 className="text-[20px] font-medium leading-tight text-[#0d0d0d]">
        {title}
      </h2>
      <p className="mt-1.5 text-sm leading-5 text-[#777]">{description}</p>
    </div>
  );
}

const UserCenter: React.FC = () => {
  const t = useTranslations("studio.userCenter");
  const {
    state,
    refreshCredits,
    refreshCreditHistory,
    clearLocalView,
  } = useStudio();
  const { data: session, isPending } = useSession();
  const [activeSection, setActiveSection] = useState<SettingsSection>("account");
  const [redeemCode, setRedeemCode] = useState("");
  const [redeemStatus, setRedeemStatus] = useState<{
    type: "success" | "error" | null;
    msg: string;
  }>({ type: null, msg: "" });
  const redeemStatusTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [historyEnabled, setHistoryEnabled] = useState(true);
  const [language, setLanguage] = useState<StudioLanguagePreference>("auto");
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [exportingData, setExportingData] = useState(false);
  const hydrated = useHydrated();

  React.useEffect(() => {
    setNotificationsEnabled(
      readBooleanPreference(STUDIO_NOTIFICATIONS_ENABLED_KEY, true)
    );
    setHistoryEnabled(readBooleanPreference(STUDIO_HISTORY_ENABLED_KEY, true));
    setLanguage(readLanguagePreference());
  }, []);

  React.useEffect(() => {
    const handlePreferenceChange = (event: Event) => {
      const nextHistoryEnabled = getBooleanPreferenceFromEvent(
        event,
        STUDIO_HISTORY_ENABLED_KEY
      );
      if (nextHistoryEnabled !== null) {
        setHistoryEnabled(nextHistoryEnabled);
      }

      const nextNotificationsEnabled = getBooleanPreferenceFromEvent(
        event,
        STUDIO_NOTIFICATIONS_ENABLED_KEY
      );
      if (nextNotificationsEnabled !== null) {
        setNotificationsEnabled(nextNotificationsEnabled);
      }

      const nextLanguage = getLanguagePreferenceFromEvent(event);
      if (nextLanguage !== null) {
        setLanguage(nextLanguage);
      }
    };

    window.addEventListener(
      STUDIO_PREFERENCES_CHANGED_EVENT,
      handlePreferenceChange
    );
    return () => {
      window.removeEventListener(
        STUDIO_PREFERENCES_CHANGED_EVENT,
        handlePreferenceChange
      );
    };
  }, []);

  const hasSession = hydrated && !isPending && Boolean(session?.user);
  const currentUser = hasSession ? session?.user : undefined;
  const currentUserRole =
    typeof (currentUser as { role?: unknown } | undefined)?.role === "string"
      ? ((currentUser as { role?: string }).role ?? null)
      : null;
  const isAdmin = checkIsAdmin(currentUser);
  const displayName =
    currentUser?.name || currentUser?.email || "未登录用户";
  const email = currentUser?.email || "登录后同步作品、积分和提示词";
  const initials = displayName.trim().slice(0, 1).toUpperCase() || "象";
  const nextRolloverDate = new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(
    new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
  );

  const sections: SettingsSectionItem[] = [
    {
      id: "account",
      label: "账户",
      description: "个人资料和登录状态",
      icon: User,
    },
    {
      id: "credits",
      label: "积分",
      description: "余额、兑换码和积分记录",
      icon: WalletCards,
    },
    {
      id: "data",
      label: "数据控制",
      description: "作品、记录和导出",
      icon: Database,
    },
    ...(isAdmin
      ? [
          {
            id: "admin" as const,
            label: "管理",
            description: "公告、用户和系统配置",
            icon: ShieldCheck,
          },
        ]
      : []),
  ];
  const currentSection = sections.some((item) => item.id === activeSection)
    ? activeSection
    : "account";

  React.useEffect(() => {
    return () => {
      if (redeemStatusTimerRef.current) {
        clearTimeout(redeemStatusTimerRef.current);
      }
    };
  }, []);

  const showRedeemStatus = (status: typeof redeemStatus) => {
    if (redeemStatusTimerRef.current) {
      clearTimeout(redeemStatusTimerRef.current);
    }

    setRedeemStatus(status);
    redeemStatusTimerRef.current = setTimeout(() => {
      setRedeemStatus({ type: null, msg: "" });
      redeemStatusTimerRef.current = null;
    }, 5000);
  };

  const handleRedeem = async () => {
    if (isRedeeming || isPending) return;

    if (!hasSession) {
      openLoginDialog();
      return;
    }

    if (!redeemCode.trim()) return;

    setIsRedeeming(true);
    try {
      const res = await fetch("/api/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: redeemCode.trim() }),
      });

      const data = await res.json();

      if (data.success) {
        showRedeemStatus({
          type: "success",
          msg: t("redeem.success", { amount: data.credits }),
        });
        setRedeemCode("");
        void refreshCredits();
        void refreshCreditHistory();
      } else {
        const serverMessage =
          typeof data.error === "string" ? data.error : "";
        const isInvalidCodeError =
          res.status === 400 ||
          serverMessage.includes("兑换码") ||
          serverMessage.includes("格式");
        showRedeemStatus({
          type: "error",
          msg: isInvalidCodeError
            ? serverMessage || t("redeem.error")
            : `兑换失败：${serverMessage || "请稍后重试"}`,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("兑换码请求失败:", error);
      showRedeemStatus({
        type: "error",
        msg: `网络错误，请检查连接后重试：${message}`,
      });
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleExportData = async () => {
    if (isPending) return;

    if (!hasSession) {
      openLoginDialog();
      return;
    }

    if (exportingData) return;

    setExportingData(true);
    try {
      await exportStudioData({
        account: {
          name: displayName,
          username: currentUser?.username ?? null,
          email: currentUser?.email ?? null,
          role: currentUserRole,
        },
        preferences: {
          section: activeSection,
          historyEnabled,
          language,
          notificationsEnabled,
        },
      });
      toast.success("数据已导出为 JSON 文件。");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(`导出失败：${message}`);
    } finally {
      setExportingData(false);
    }
  };

  const handleClearLocalView = () => {
    clearLocalView();
    setClearDialogOpen(false);
    dispatchStudioEvent(STUDIO_LOCAL_VIEW_CLEARED_EVENT);
    toast.success("本地视图已清空。云端作品不会被删除。");
  };

  const renderAccountSection = () => (
    <div>
      <SectionHeading
        title="账户"
        description="管理你的登录状态、个人资料和基础偏好。"
      />

      <div className="mb-5 rounded-xl border border-[#e7e7e7] bg-white px-4 py-3">
        <div className="flex items-center gap-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#0d0d0d] text-sm font-medium text-white">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-[#0d0d0d]">
              {displayName}
            </p>
            <p className="mt-0.5 text-sm leading-5 text-[#777]">{email}</p>
          </div>
          {hasSession ? (
            <SmallButton href="/studio/subscription">购买积分</SmallButton>
          ) : (
            <SmallButton onClick={openLoginDialog}>登录</SmallButton>
          )}
        </div>
      </div>

      <div className="space-y-5">
      <SettingsGroup label="个人资料">
        <SettingsRow icon={User} title="名称" description={displayName} />
        <RowDivider />
        <SettingsRow icon={Mail} title="邮箱" description={email} />
        <RowDivider />
        <SettingsRow
          icon={ShieldCheck}
          title="账号状态"
          description={hasSession ? "已登录，作品和积分会同步保存" : "未登录，生成前会提示登录"}
          action={
            hasSession ? (
              <span className="rounded-full bg-[#f4f4f4] px-3 py-1 text-xs text-[#555]">
                已登录
              </span>
            ) : (
              <button
                type="button"
                onClick={openLoginDialog}
                className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[#0d0d0d] px-3 text-xs font-medium text-white hover:bg-[#333]"
              >
                <LogIn className="size-3.5" />
                登录
              </button>
            )
          }
        />
      </SettingsGroup>

      <SettingsGroup label="个性化">
        <SettingsRow
          icon={Bell}
          title="通知"
          description={notificationsEnabled ? "任务完成后显示提醒" : "任务完成提醒已关闭"}
          action={
            <SettingsSwitch
              checked={notificationsEnabled}
              onChange={(checked) => {
                setNotificationsEnabled(checked);
                writeBooleanPreference(STUDIO_NOTIFICATIONS_ENABLED_KEY, checked);
                toast.info(checked ? "已打开任务提醒" : "已关闭任务提醒");
              }}
              label="任务完成通知"
              size="md"
            />
          }
        />
        <RowDivider />
        <SettingsRow
          icon={History}
          title="保存创作记录"
          description={historyEnabled ? "新会话会显示在最近记录中" : "新会话不会进入最近记录"}
          action={
            <SettingsSwitch
              checked={historyEnabled}
              onChange={(checked) => {
                setHistoryEnabled(checked);
                writeBooleanPreference(STUDIO_HISTORY_ENABLED_KEY, checked);
                toast.info(checked ? "已打开创作记录" : "已关闭创作记录");
              }}
              label="保存创作记录"
              size="md"
            />
          }
        />
      </SettingsGroup>
      </div>
    </div>
  );

  const renderCreditsSection = () => (
    <div>
      <SectionHeading
        title="积分"
        description="查看余额、兑换额度，并追踪积分变化。"
      />

      <div className="space-y-5">
      <SettingsGroup label="积分">
        <SettingsRow
          icon={WalletCards}
          title={t("creditWallet.title")}
          description={`余额 ${state.credits} 积分`}
          action={<SmallButton href="/studio/subscription">充值</SmallButton>}
        />
        <RowDivider />
        <SettingsRow
          icon={CreditCard}
          title={t("creditWallet.currentPlan")}
          description={t("creditWallet.currentTier")}
        />
        <RowDivider />
        <SettingsRow
          icon={CalendarDays}
          title={t("creditWallet.nextRollover")}
          description={nextRolloverDate}
        />
      </SettingsGroup>

      <section>
        <p className="mb-2 px-1 text-xs font-medium text-[#8a8a8a]">兑换</p>
        <div className="rounded-xl border border-[#e7e7e7] bg-white p-4">
          <div className="mb-3 flex items-start gap-3">
            <Gift className="mt-0.5 size-5 text-[#777]" strokeWidth={1.9} />
            <div>
              <p className="text-sm font-medium text-[#0d0d0d]">
                {t("redeem.label")}
              </p>
              <p className="mt-0.5 text-sm leading-6 text-[#777]">
                输入兑换码后，积分会加入当前账号。
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
            <div className="flex flex-1 flex-col gap-1">
              <input
                value={redeemCode}
                onChange={(event) => setRedeemCode(event.target.value)}
                placeholder={t("redeem.placeholder")}
                aria-label={t("redeem.label")}
                autoComplete="off"
                inputMode="text"
                className="h-11 w-full rounded-full border border-[#d9d9d9] bg-white px-4 text-[15px] uppercase outline-none transition focus:border-[#0d0d0d] focus:ring-4 focus:ring-black/10"
              />
              {redeemStatus.msg && (
                <p
                  className={cn(
                    "px-1 text-xs",
                    redeemStatus.type === "success"
                      ? "text-green-600"
                      : "text-red-500"
                  )}
                >
                  {redeemStatus.msg}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={handleRedeem}
              disabled={
                isRedeeming ||
                isPending ||
                (hasSession && !redeemCode.trim())
              }
              aria-label={!hasSession ? "登录后兑换积分" : t("redeem.button")}
              className="h-11 rounded-full bg-[#0d0d0d] px-5 text-sm font-medium text-white transition hover:bg-[#2a2a2a] disabled:bg-[#d7d7d7]"
            >
              {!hasSession
                ? "登录后兑换"
                : isRedeeming
                  ? "兑换中..."
                  : t("redeem.button")}
            </button>
          </div>
        </div>
      </section>

      <section>
        <p className="mb-2 px-1 text-xs font-medium text-[#8a8a8a]">记录</p>
        <div className="overflow-hidden rounded-xl border border-[#e7e7e7] bg-white">
          <div className="flex items-center gap-3 border-b border-[#eeeeee] px-4 py-3">
            <History className="size-5 text-[#777]" strokeWidth={1.9} />
            <h2 className="text-sm font-medium text-[#0d0d0d]">
              {t("tabs.credits")}
            </h2>
          </div>
          {state.creditHistory.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-[#777]">
              {t("table.noTransactions")}
            </div>
          ) : (
            <div className="divide-y divide-[#eeeeee]">
              {state.creditHistory.map((txn) => (
                <div key={txn.id} className="flex items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[#0d0d0d]">
                      {txn.reason}
                    </p>
                    <p className="mt-1 text-xs text-[#777]">
                      {txn.date.toLocaleDateString()}{" "}
                      {txn.date.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <p
                    className={cn(
                      "shrink-0 text-sm font-medium",
                      txn.type === "deduction"
                        ? "text-[#0d0d0d]"
                        : "text-green-600"
                    )}
                  >
                    {txn.type === "deduction" ? "-" : "+"}
                    {txn.amount}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
      </div>
    </div>
  );

  const renderDataSection = () => (
    <div>
      <SectionHeading
        title="数据控制"
        description="管理作品、创作记录，以及本地视图里的临时数据。"
      />

      <div className="space-y-5">
      <SettingsGroup label="数据控制">
        <SettingsRow
          icon={Database}
          title="作品库"
          description="查看生成后的图片、视频和任务记录"
          action={
            <Link
              href="/studio/assets"
              className="inline-flex items-center gap-1 text-sm text-[#0d0d0d] hover:underline"
            >
              打开
              <ChevronRight className="size-4" />
            </Link>
          }
        />
        <RowDivider />
        <SettingsRow
          icon={History}
          title="创作记录"
          description="左侧最近记录会显示已保存的会话"
          action={
            <Link
              href="/studio"
              className="inline-flex items-center gap-1 text-sm text-[#0d0d0d] hover:underline"
            >
              新建
              <ChevronRight className="size-4" />
            </Link>
          }
        />
        <RowDivider />
        <SettingsRow
          icon={Sparkles}
          title="导出数据"
          description="导出作品、任务和积分明细"
          action={
            <button
              type="button"
              onClick={() => void handleExportData()}
              disabled={isPending || exportingData}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#f4f4f4] px-3 py-1 text-xs text-[#555] hover:bg-[#ececec] disabled:text-[#aaa]"
            >
              <Download className="size-3.5" strokeWidth={1.9} />
              {isPending ? "检查中" : exportingData ? "导出中" : "导出"}
            </button>
          }
        />
        <RowDivider />
        <SettingsRow
          icon={Trash2}
          title="清空本地视图"
          description="只清空当前浏览器里的临时显示，不删除云端作品"
          action={
            <button
              type="button"
              onClick={() => setClearDialogOpen(true)}
              className="rounded-full bg-[#fff1f1] px-3 py-1 text-xs font-medium text-red-600 hover:bg-[#ffe4e4]"
            >
              清空
            </button>
          }
        />
      </SettingsGroup>
      </div>
    </div>
  );

  const renderAdminSection = () => (
    <div>
      <SectionHeading
        title="管理"
        description="进入后台处理用户、订单、公告和生成配置。"
      />

      <div className="space-y-5">
      <section>
        <p className="mb-2 px-1 text-xs font-medium text-[#8a8a8a]">管理</p>
        <div className="rounded-xl border border-[#e7e7e7] bg-white p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <ShieldCheck
                className="mt-0.5 size-5 text-[#777]"
                strokeWidth={1.9}
              />
              <div>
                <p className="text-sm font-medium text-[#0d0d0d]">管理后台</p>
                <p className="mt-0.5 text-sm leading-6 text-[#777]">
                  管理公告、用户、订单、兑换码和生成配置。
                </p>
              </div>
            </div>
            <Link
              href="/studio/admin"
              className="inline-flex h-9 items-center justify-center gap-2 rounded-full bg-[#0d0d0d] px-4 text-sm text-white hover:bg-[#333]"
            >
              打开后台
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>
      </div>
    </div>
  );

  const renderActiveSection = () => {
    if (currentSection === "credits") return renderCreditsSection();
    if (currentSection === "data") return renderDataSection();
    if (currentSection === "admin" && isAdmin) return renderAdminSection();
    return renderAccountSection();
  };

  return (
    <div className="custom-scrollbar flex h-full flex-1 flex-col overflow-y-auto bg-white text-[#0d0d0d]">
      <div className="mx-auto flex w-full max-w-[900px] flex-col px-4 pb-12 pt-4 md:px-6 md:pt-8">
        <div className="mb-4 flex items-end justify-between gap-4 md:hidden">
          <div>
            <h1 className="text-[28px] font-semibold leading-tight tracking-normal">
              设置
            </h1>
          </div>
        </div>

        <div className="sticky top-0 z-10 -mx-4 mb-4 overflow-x-auto bg-white/95 px-4 pb-3 pt-1 backdrop-blur md:hidden">
          <div className="flex w-max gap-1 rounded-full bg-[#f4f4f4] p-1">
            {sections.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSection(item.id)}
                className={cn(
                  "flex h-9 items-center gap-2 rounded-full px-3.5 text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-black/15",
                  currentSection === item.id
                    ? "bg-[#0d0d0d] text-white"
                    : "text-[#555] hover:text-[#0d0d0d]"
                )}
              >
                <item.icon className="size-4" strokeWidth={1.9} />
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-none bg-white md:grid md:min-h-[min(620px,calc(100vh-112px))] md:grid-cols-[188px_minmax(0,1fr)] md:rounded-[18px] md:border md:border-[#d9d9d9]">
          <aside className="hidden border-r border-[#eeeeee] bg-[#fbfbfb] md:block">
            <div className="sticky top-4 p-2">
              <div className="px-3 pb-3 pt-3">
                <h1 className="text-xl font-medium leading-tight text-[#0d0d0d]">
                  设置
                </h1>
              </div>
              {sections.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveSection(item.id)}
                  className={cn(
                    "flex h-10 w-full items-center gap-2 rounded-lg px-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-black/15",
                    currentSection === item.id
                      ? "bg-[#ececec]"
                      : "hover:bg-black/[0.04]"
                  )}
                >
                  <item.icon className="size-4 shrink-0 text-[#555]" strokeWidth={1.9} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-[#0d0d0d]">
                      {item.label}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </aside>

          <main className="min-w-0 px-0 pb-2 md:px-6 md:py-6">
            {renderActiveSection()}
          </main>
        </div>
      </div>

      <Dialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <DialogContent
          data-clear-local-view-dialog="true"
          data-studio-dialog-surface="clear-local-view"
          className="rounded-2xl border-[#e5e5e5] bg-white shadow-[0_18px_60px_rgba(0,0,0,0.16)] sm:max-w-md"
        >
          <DialogHeader>
            <DialogTitle className="text-lg font-medium text-[#0d0d0d]">
              清空本地视图？
            </DialogTitle>
            <DialogDescription className="text-sm leading-6 text-[#777]">
              这只会清空当前浏览器里的临时列表显示，不会删除云端作品、积分记录或订单。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setClearDialogOpen(false)}
              className="rounded-full border-[#d9d9d9]"
            >
              取消
            </Button>
            <Button
              type="button"
              onClick={handleClearLocalView}
              className="rounded-full bg-red-600 text-white hover:bg-red-700"
            >
              清空视图
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserCenter;
