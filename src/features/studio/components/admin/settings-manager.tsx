"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import type { LucideIcon } from "lucide-react";
import { Check, Clock3, ImageIcon, Save, Settings2, Video } from "lucide-react";
import { cn } from "@/lib/utils";

type VideoProvider = "kie" | "duomi" | "veo";

const PROVIDER_LABELS: Record<VideoProvider, string> = {
  kie: "KIE AI",
  duomi: "Duomi",
  veo: "VEO",
};

const PROVIDER_OPTIONS: Array<{ value: VideoProvider; label: string }> = [
  { value: "kie", label: "KIE AI" },
  { value: "duomi", label: "Duomi" },
  { value: "veo", label: "VEO" },
];

interface GlobalSettings {
  dailyFastVideoLimit: number;
  dailyQualityVideoLimit: number;
  videoFastProvider: VideoProvider;
  videoQualityProvider: VideoProvider;
  creditCostVideoFast: number;
  creditCostVideoQuality: number;
  creditCostImage: number;
}

const DEFAULT_SETTINGS: GlobalSettings = {
  dailyFastVideoLimit: -1,
  dailyQualityVideoLimit: 2,
  videoFastProvider: "kie",
  videoQualityProvider: "kie",
  creditCostVideoFast: 30,
  creditCostVideoQuality: 100,
  creditCostImage: 10,
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isVideoProvider(value: unknown): value is VideoProvider {
  return value === "kie" || value === "duomi" || value === "veo";
}

function normalizeSettings(data: Partial<GlobalSettings>): GlobalSettings {
  return {
    dailyFastVideoLimit:
      typeof data.dailyFastVideoLimit === "number"
        ? data.dailyFastVideoLimit
        : DEFAULT_SETTINGS.dailyFastVideoLimit,
    dailyQualityVideoLimit:
      typeof data.dailyQualityVideoLimit === "number"
        ? data.dailyQualityVideoLimit
        : DEFAULT_SETTINGS.dailyQualityVideoLimit,
    videoFastProvider: isVideoProvider(data.videoFastProvider)
      ? data.videoFastProvider
      : DEFAULT_SETTINGS.videoFastProvider,
    videoQualityProvider: isVideoProvider(data.videoQualityProvider)
      ? data.videoQualityProvider
      : DEFAULT_SETTINGS.videoQualityProvider,
    creditCostVideoFast:
      typeof data.creditCostVideoFast === "number"
        ? data.creditCostVideoFast
        : DEFAULT_SETTINGS.creditCostVideoFast,
    creditCostVideoQuality:
      typeof data.creditCostVideoQuality === "number"
        ? data.creditCostVideoQuality
        : DEFAULT_SETTINGS.creditCostVideoQuality,
    creditCostImage:
      typeof data.creditCostImage === "number"
        ? data.creditCostImage
        : DEFAULT_SETTINGS.creditCostImage,
  };
}

function formatLimit(value: number): string {
  if (value === -1) return "不限";
  if (value === 0) return "停用";
  return `${value} 次/天`;
}

function SettingGroup({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-[#e5e5e5] bg-white">
      <div className="border-b border-[#ececec] bg-[#fbfbfb] px-4 py-3">
        <h3 className="text-sm font-medium text-[#0d0d0d]">{title}</h3>
        <p className="mt-1 text-xs leading-5 text-[#777]">{description}</p>
      </div>
      <div className="divide-y divide-[#ececec]">{children}</div>
    </section>
  );
}

function SettingRow({
  icon: Icon,
  title,
  description,
  saved,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  saved: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-3 px-4 py-4 md:grid-cols-[minmax(220px,1fr)_minmax(240px,320px)] md:items-center">
      <div className="flex min-w-0 gap-3">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-[#f4f4f4] text-[#555]">
          <Icon className="size-4" strokeWidth={1.9} />
        </span>
        <div className="min-w-0">
          <h4 className="text-sm font-medium text-[#0d0d0d]">{title}</h4>
          <p className="mt-1 text-sm leading-6 text-[#777]">{description}</p>
          <p className="mt-1 text-xs text-[#8a8a8a]">已保存：{saved}</p>
        </div>
      </div>
      <div className="md:justify-self-end">{children}</div>
    </div>
  );
}

function ProviderControl({
  value,
  onChange,
  label,
}: {
  value: VideoProvider;
  onChange: (value: VideoProvider) => void;
  label: string;
}) {
  return (
    <div
      className="grid w-full grid-cols-3 rounded-full bg-[#f4f4f4] p-1 md:w-[300px]"
      aria-label={label}
    >
      {PROVIDER_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={cn(
            "h-9 min-w-0 rounded-full px-3 text-sm transition",
            value === option.value
              ? "bg-white text-[#0d0d0d] shadow-sm"
              : "text-[#777] hover:text-[#0d0d0d]"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function NumberControl({
  value,
  onChange,
  label,
  min = 0,
}: {
  value: number;
  onChange: (value: number) => void;
  label: string;
  min?: number;
}) {
  return (
    <Input
      type="number"
      value={value}
      onChange={(event) =>
        onChange(Number.parseInt(event.target.value, 10) || 0)
      }
      min={min}
      aria-label={label}
      inputMode="numeric"
      className="h-10 w-full rounded-full border-[#d9d9d9] bg-white px-4 text-sm shadow-none md:w-[180px]"
    />
  );
}

export default function SettingsManager() {
  const [settings, setSettings] = useState<GlobalSettings | null>(null);
  const [form, setForm] = useState<GlobalSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings");
      if (!res.ok) {
        throw new Error(`请求失败（状态码 ${res.status}）`);
      }
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "加载设置失败");
      }
      const nextSettings = normalizeSettings(json.data);
      setSettings(nextSettings);
      setForm(nextSettings);
    } catch (error) {
      console.error("加载系统设置失败:", error);
      toast.error(`加载设置失败：${getErrorMessage(error)}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const hasChanges = useMemo(() => {
    if (!settings) return false;
    return Object.keys(DEFAULT_SETTINGS).some((key) => {
      const settingKey = key as keyof GlobalSettings;
      return form[settingKey] !== settings[settingKey];
    });
  }, [form, settings]);

  const updateForm = <Key extends keyof GlobalSettings>(
    key: Key,
    value: GlobalSettings[Key]
  ) => {
    setSaved(false);
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSave = async () => {
    if (!hasChanges || saving) return;
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(
          data?.error || `请求失败（状态码 ${res.status}）`
        );
      }
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "保存设置失败");
      }
      const nextSettings = normalizeSettings(json.data);
      setSettings(nextSettings);
      setForm(nextSettings);
      setSaved(true);
      toast.success("设置已保存");
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error("保存系统设置失败:", error);
      toast.error(`保存设置失败：${getErrorMessage(error)}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl space-y-3">
        {[0, 1, 2, 3].map((item) => (
          <div
            key={item}
            className={cn(
              "animate-pulse rounded-lg bg-[#f4f4f4]",
              item === 0 ? "h-20" : "h-28"
            )}
          />
        ))}
      </div>
    );
  }

  if (!settings) {
    return <div className="text-sm text-red-500">加载设置失败</div>;
  }

  return (
    <div className="max-w-4xl space-y-5 pb-20 md:pb-0">
      <div className="flex flex-col gap-3 border-b border-[#ececec] pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#f4f4f4] text-[#555]">
            <Settings2 className="size-4" strokeWidth={1.9} />
          </span>
          <div>
            <h3 className="text-base font-medium text-[#0d0d0d]">生成配置</h3>
            <p className="mt-1 text-sm leading-6 text-[#777]">
              供应商、积分和每日限额会影响所有用户。
            </p>
          </div>
        </div>
        <span
          className={cn(
            "inline-flex h-8 w-fit items-center rounded-full px-3 text-xs font-medium",
            hasChanges
              ? "bg-[#fff7ed] text-[#9a3412]"
              : "bg-[#f4f4f4] text-[#666]"
          )}
        >
          {hasChanges ? "有未保存修改" : saved ? "已保存" : "已同步"}
        </span>
      </div>

      <SettingGroup
        title="视频供应商"
        description="为两种视频模式分别选择生成供应商。"
      >
        <SettingRow
          icon={Video}
          title="快速视频供应商"
          description="Fast 模式使用的默认视频生成服务。"
          saved={PROVIDER_LABELS[settings.videoFastProvider]}
        >
          <ProviderControl
            value={form.videoFastProvider}
            onChange={(value) => updateForm("videoFastProvider", value)}
            label="快速视频供应商"
          />
        </SettingRow>
        <SettingRow
          icon={Clock3}
          title="高质量视频供应商"
          description="Quality 模式使用的默认视频生成服务。"
          saved={PROVIDER_LABELS[settings.videoQualityProvider]}
        >
          <ProviderControl
            value={form.videoQualityProvider}
            onChange={(value) => updateForm("videoQualityProvider", value)}
            label="高质量视频供应商"
          />
        </SettingRow>
      </SettingGroup>

      <SettingGroup
        title="积分消耗"
        description="设置各类生成任务每次扣除的积分。"
      >
        <SettingRow
          icon={Video}
          title="快速视频积分"
          description={`当前为 ${form.creditCostVideoFast} 积分/次。`}
          saved={`${settings.creditCostVideoFast} 积分`}
        >
          <NumberControl
            value={form.creditCostVideoFast}
            onChange={(value) => updateForm("creditCostVideoFast", value)}
            label="快速视频积分消耗"
          />
        </SettingRow>
        <SettingRow
          icon={Clock3}
          title="高质量视频积分"
          description={`当前为 ${form.creditCostVideoQuality} 积分/次。`}
          saved={`${settings.creditCostVideoQuality} 积分`}
        >
          <NumberControl
            value={form.creditCostVideoQuality}
            onChange={(value) => updateForm("creditCostVideoQuality", value)}
            label="高质量视频积分消耗"
          />
        </SettingRow>
        <SettingRow
          icon={ImageIcon}
          title="图片生成积分"
          description={`当前为 ${form.creditCostImage} 积分/次。`}
          saved={`${settings.creditCostImage} 积分`}
        >
          <NumberControl
            value={form.creditCostImage}
            onChange={(value) => updateForm("creditCostImage", value)}
            label="图片生成积分消耗"
          />
        </SettingRow>
      </SettingGroup>

      <SettingGroup
        title="每日视频限额"
        description="-1 表示不限，0 表示停用，正数表示每日次数。"
      >
        <SettingRow
          icon={Video}
          title="快速视频每日限额"
          description={`当前为 ${formatLimit(form.dailyFastVideoLimit)}。`}
          saved={formatLimit(settings.dailyFastVideoLimit)}
        >
          <NumberControl
            value={form.dailyFastVideoLimit}
            onChange={(value) => updateForm("dailyFastVideoLimit", value)}
            min={-1}
            label="快速视频每日限额"
          />
        </SettingRow>
        <SettingRow
          icon={Clock3}
          title="高质量视频每日限额"
          description={`当前为 ${formatLimit(form.dailyQualityVideoLimit)}。`}
          saved={formatLimit(settings.dailyQualityVideoLimit)}
        >
          <NumberControl
            value={form.dailyQualityVideoLimit}
            onChange={(value) => updateForm("dailyQualityVideoLimit", value)}
            min={-1}
            label="质量视频每日限额"
          />
        </SettingRow>
      </SettingGroup>

      {(hasChanges || saving || saved) && (
        <div className="sticky bottom-0 z-10 -mx-4 border-t border-[#eeeeee] bg-white/95 px-4 py-3 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:px-0 md:py-0">
          <div className="flex flex-col gap-3 rounded-lg border border-[#e5e5e5] bg-white p-3 shadow-sm md:flex-row md:items-center md:justify-between md:p-4">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 text-sm",
                saved ? "text-green-700" : "text-[#9a3412]"
              )}
            >
              {saved && <Check className="size-4" strokeWidth={1.9} />}
              {saved ? "已保存" : "修改后需要保存才会生效"}
            </span>
            <Button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className="h-10 rounded-full bg-[#0d0d0d] px-5 text-white hover:bg-[#2a2a2a]"
            >
              <Save className="size-4" strokeWidth={1.9} />
              {saving ? "保存中..." : "保存设置"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
