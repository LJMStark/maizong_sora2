"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  CircleUserRound,
  ChevronRight,
  Database,
  Download,
  Settings,
  Sparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { exportStudioData } from "../../utils/studio-data-export";
import {
  applyStudioAppearance,
  getAppearancePreferenceFromEvent,
  getBooleanPreferenceFromEvent,
  getLanguagePreferenceFromEvent,
  readBooleanPreference,
  readAppearancePreference,
  readLanguagePreference,
  STUDIO_APPEARANCE_KEY,
  STUDIO_HISTORY_ENABLED_KEY,
  STUDIO_NOTIFICATIONS_ENABLED_KEY,
  STUDIO_PREFERENCES_CHANGED_EVENT,
  type StudioAppearancePreference,
  type StudioLanguagePreference,
  writeAppearancePreference,
  writeBooleanPreference,
  writeLanguagePreference,
} from "../../utils/studio-preferences";

type SettingsTab = "general" | "account" | "data";

interface SettingsUser {
  name?: string | null;
  username?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string | null;
}

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hasSession: boolean;
  user?: SettingsUser | null;
  onRequestLogin: () => void;
}

const tabs: Array<{
  id: SettingsTab;
  label: string;
}> = [
  { id: "general", label: "通用" },
  { id: "account", label: "账号" },
  { id: "data", label: "数据控制" },
];

const appearanceLabels: Record<StudioAppearancePreference, string> = {
  system: "系统",
  light: "浅色",
  dark: "深色",
};

const languageLabels: Record<StudioLanguagePreference, string> = {
  auto: "自动检测",
  "zh-CN": "简体中文",
};

function SettingsSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-10 rounded-full transition-colors",
        checked ? "bg-[#0d0d0d]" : "bg-[#d9d9d9]"
      )}
    >
      <span
        className={cn(
          "absolute top-1 size-4 rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-5" : "translate-x-1"
        )}
      />
    </button>
  );
}

function SelectControl<T extends string>({
  value,
  onChange,
  label,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  label: string;
  options: Array<{ value: T; label: string }>;
}) {
  return (
    <select
      value={value}
      aria-label={label}
      onChange={(event) => onChange(event.target.value as T)}
      className="h-9 rounded-lg border border-[#d9d9d9] bg-white px-3 text-sm text-[#0d0d0d] outline-none transition hover:bg-[#f7f7f7] focus:border-[#0d0d0d] focus:ring-4 focus:ring-black/10"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function SettingsRow({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[58px] items-center justify-between gap-4 border-b border-[#eeeeee] px-5 py-3 last:border-b-0">
      <div className="min-w-0">
        <p className="text-sm font-medium leading-5 text-[#0d0d0d]">{title}</p>
        {description && (
          <p className="mt-0.5 text-sm leading-5 text-[#777]">{description}</p>
        )}
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  );
}

function AccountInitial({
  label,
  image,
}: {
  label: string;
  image?: string | null;
}) {
  if (image) {
    return (
      <span
        className="size-12 rounded-full bg-cover bg-center"
        style={{ backgroundImage: `url("${image.replace(/"/g, "%22")}")` }}
      />
    );
  }

  return (
    <span className="flex size-12 items-center justify-center rounded-full bg-[#0d0d0d] text-sm font-medium text-white">
      {label}
    </span>
  );
}

function SectionTitle({
  icon: Icon,
  title,
}: {
  icon: React.ElementType;
  title: string;
}) {
  return (
    <div className="mb-3 flex items-center gap-2 px-5">
      <Icon className="size-4 text-[#777]" strokeWidth={1.9} />
      <h3 className="text-base font-medium leading-6 text-[#0d0d0d]">
        {title}
      </h3>
    </div>
  );
}

export function SettingsDialog({
  open,
  onOpenChange,
  hasSession,
  user,
  onRequestLogin,
}: SettingsDialogProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<SettingsTab>("general");
  const [appearance, setAppearance] =
    React.useState<StudioAppearancePreference>(() => readAppearancePreference());
  const [language, setLanguage] = React.useState<StudioLanguagePreference>(
    () => readLanguagePreference()
  );
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  const [historyEnabled, setHistoryEnabled] = React.useState(true);
  const [loadedPreferences, setLoadedPreferences] = React.useState(false);
  const [exportingData, setExportingData] = React.useState(false);

  React.useEffect(() => {
    const savedAppearance = readAppearancePreference();
    const savedLanguage = readLanguagePreference();

    setAppearance(savedAppearance);
    applyStudioAppearance(savedAppearance);
    setLanguage(savedLanguage);
    setNotificationsEnabled(
      readBooleanPreference(STUDIO_NOTIFICATIONS_ENABLED_KEY, true)
    );
    setHistoryEnabled(readBooleanPreference(STUDIO_HISTORY_ENABLED_KEY, true));
    setLoadedPreferences(true);
  }, []);

  React.useEffect(() => {
    const handlePreferenceChange = (event: Event) => {
      const nextAppearance = getAppearancePreferenceFromEvent(event);
      if (nextAppearance !== null) {
        setAppearance(nextAppearance);
        applyStudioAppearance(nextAppearance);
      }

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

  React.useEffect(() => {
    if (!loadedPreferences) return;

    writeAppearancePreference(appearance);
  }, [appearance, loadedPreferences]);

  React.useEffect(() => {
    if (appearance !== "system") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemThemeChange = () => {
      applyStudioAppearance("system");
      window.dispatchEvent(
        new CustomEvent(STUDIO_PREFERENCES_CHANGED_EVENT, {
          detail: {
            key: STUDIO_APPEARANCE_KEY,
            value: "system",
          },
        })
      );
    };

    media.addEventListener("change", handleSystemThemeChange);
    return () => {
      media.removeEventListener("change", handleSystemThemeChange);
    };
  }, [appearance]);

  React.useEffect(() => {
    if (!loadedPreferences) return;

    writeLanguagePreference(language);
  }, [language, loadedPreferences]);

  React.useEffect(() => {
    if (!loadedPreferences) return;

    writeBooleanPreference(
      STUDIO_NOTIFICATIONS_ENABLED_KEY,
      notificationsEnabled
    );
  }, [notificationsEnabled, loadedPreferences]);

  React.useEffect(() => {
    if (!loadedPreferences) return;

    writeBooleanPreference(STUDIO_HISTORY_ENABLED_KEY, historyEnabled);
  }, [historyEnabled, loadedPreferences]);

  const handleNavigate = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  const handleExportData = async () => {
    if (!hasSession) {
      onOpenChange(false);
      window.setTimeout(onRequestLogin, 120);
      return;
    }

    if (exportingData) return;

    setExportingData(true);
    try {
      await exportStudioData({
        account: {
          name: userName,
          username: user?.username ?? null,
          email: user?.email ?? null,
          role: user?.role ?? null,
        },
        preferences: {
          appearance,
          language,
          notificationsEnabled,
          historyEnabled,
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

  const userName =
    hasSession
      ? user?.name?.trim() ||
        user?.username?.trim() ||
        user?.email?.split("@")[0] ||
        "小象用户"
      : "未登录用户";
  const userEmail = hasSession
    ? user?.email?.trim() || "未绑定邮箱"
    : "登录后同步作品、积分和提示词";
  const userRole = user?.role === "admin" ? "管理员" : "普通用户";
  const userInitial = userName.trim().slice(0, 1).toUpperCase() || "象";

  const renderGeneral = () => (
    <div>
      <SectionTitle icon={Settings} title="通用" />
      <div className="divide-y divide-[#eeeeee]">
        <SettingsRow
          title="外观"
          action={
            <SelectControl
              value={appearance}
              label="外观"
              onChange={(value) => {
                setAppearance(value);
                toast.info(`外观已切换为${appearanceLabels[value]}`);
              }}
              options={[
                { value: "system", label: appearanceLabels.system },
                { value: "light", label: appearanceLabels.light },
                { value: "dark", label: appearanceLabels.dark },
              ]}
            />
          }
        />
        <SettingsRow
          title="语言"
          action={
            <SelectControl
              value={language}
              label="语言"
              onChange={(value) => {
                setLanguage(value);
                toast.info(`语言已切换为${languageLabels[value]}`);
              }}
              options={[
                { value: "auto", label: languageLabels.auto },
                { value: "zh-CN", label: languageLabels["zh-CN"] },
              ]}
            />
          }
        />
        <SettingsRow
          title="任务完成通知"
          description={
            notificationsEnabled
              ? "生成任务完成后显示提醒。"
              : "不会主动显示任务完成提醒。"
          }
          action={
            <SettingsSwitch
              checked={notificationsEnabled}
              label="任务完成通知"
              onChange={(checked) => {
                setNotificationsEnabled(checked);
                toast.info(checked ? "已打开任务提醒" : "已关闭任务提醒");
              }}
            />
          }
        />
      </div>
    </div>
  );

  const renderAccount = () => (
    <div>
      <SectionTitle icon={CircleUserRound} title="账号" />
      <div className="mx-5 mb-3 flex items-center gap-3 rounded-xl border border-[#eeeeee] bg-[#fbfbfb] p-3">
        <AccountInitial label={userInitial} image={user?.image} />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium leading-5 text-[#0d0d0d]">
            {userName}
          </p>
          <p className="mt-0.5 truncate text-sm leading-5 text-[#777]">
            {userEmail}
          </p>
        </div>
      </div>
      <div className="divide-y divide-[#eeeeee]">
        <SettingsRow
          title="方案"
          description={hasSession ? userRole : "登录后查看当前方案和积分权益。"}
          action={
            hasSession ? (
              <button
                type="button"
                onClick={() => handleNavigate("/studio/subscription")}
                className="inline-flex h-9 items-center gap-1 rounded-lg px-3 text-sm text-[#0d0d0d] hover:bg-black/5"
              >
                管理
                <ChevronRight className="size-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  window.setTimeout(onRequestLogin, 120);
                }}
                className="inline-flex h-9 items-center rounded-lg bg-[#0d0d0d] px-3 text-sm font-medium text-white hover:bg-[#2a2a2a]"
              >
                登录
              </button>
            )
          }
        />
        <SettingsRow
          title="邮箱"
          description={userEmail}
          action={
            <span className="rounded-full bg-[#f4f4f4] px-2.5 py-1 text-xs text-[#555]">
              {hasSession ? "已登录" : "未登录"}
            </span>
          }
        />
        <SettingsRow
          title="个人中心"
          description="查看积分、兑换码和数据管理。"
          action={
            <button
              type="button"
              onClick={() => handleNavigate("/studio/profile")}
              className="inline-flex h-9 items-center gap-1 rounded-lg px-3 text-sm text-[#0d0d0d] hover:bg-black/5"
            >
              打开
              <ChevronRight className="size-4" />
            </button>
          }
        />
      </div>
    </div>
  );

  const renderDataControls = () => (
    <div>
      <SectionTitle icon={Database} title="数据控制" />
      <div className="divide-y divide-[#eeeeee]">
        <SettingsRow
          title="作品库"
          description="查看生成后的图片、视频和任务记录。"
          action={
            <button
              type="button"
              onClick={() => handleNavigate("/studio/assets")}
              className="inline-flex h-9 items-center gap-1 rounded-lg px-3 text-sm text-[#0d0d0d] hover:bg-black/5"
            >
              打开
              <ChevronRight className="size-4" />
            </button>
          }
        />
        <SettingsRow
          title="创作记录"
          description={
            historyEnabled
              ? "最近记录会显示已保存的会话。"
              : "最近记录不会主动显示新会话。"
          }
          action={
            <SettingsSwitch
              checked={historyEnabled}
              label="保存创作记录"
              onChange={(checked) => {
                setHistoryEnabled(checked);
                toast.info(checked ? "已打开创作记录" : "已关闭创作记录");
              }}
            />
          }
        />
        <SettingsRow
          title="导出数据"
          description="导出作品、任务和积分明细。"
          action={
            <button
              type="button"
              onClick={() => void handleExportData()}
              disabled={exportingData}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#0d0d0d] px-3 text-sm font-medium text-white hover:bg-[#2a2a2a] disabled:bg-[#cfcfcf]"
            >
              {hasSession ? (
                <Download className="size-4" />
              ) : (
                <Sparkles className="size-4" />
              )}
              {hasSession ? (exportingData ? "导出中" : "导出") : "登录"}
            </button>
          }
        />
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-studio-settings-surface="true"
        className="max-h-[calc(100vh-32px)] gap-0 overflow-hidden rounded-2xl border border-[#d8d8d8] bg-white p-0 shadow-[0_24px_80px_rgba(0,0,0,0.18)] sm:max-w-[680px]"
      >
        <DialogTitle className="sr-only">设置</DialogTitle>
        <div className="flex min-h-[420px] flex-col sm:h-[520px] sm:flex-row">
          <aside className="border-b border-[#eeeeee] bg-[#fbfbfb] sm:w-[178px] sm:border-b-0 sm:border-r">
            <div className="px-4 pb-2 pt-4">
              <p className="text-lg font-medium leading-7 text-[#0d0d0d]">
                设置
              </p>
            </div>
            <nav className="flex gap-1 overflow-x-auto px-2 pb-2 sm:block sm:space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex h-9 shrink-0 items-center rounded-lg px-3 text-sm text-[#0d0d0d] hover:bg-black/5 sm:w-full",
                    activeTab === tab.id && "bg-black/[0.06]"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </aside>

          <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto py-5">
            {activeTab === "general"
              ? renderGeneral()
              : activeTab === "account"
                ? renderAccount()
                : renderDataControls()}
            <div className="mt-6 px-5">
              <button
                type="button"
                onClick={() => handleNavigate("/studio/profile")}
                className="inline-flex h-9 items-center gap-1 rounded-lg px-3 text-sm text-[#555] hover:bg-black/5 hover:text-[#0d0d0d]"
              >
                打开完整个人中心
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
