"use client";

import React from "react";
import {
  Check,
  Palette,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type WorkStyle = "balanced" | "concise" | "creative" | "precise";
type ElephantColor = "black" | "blue" | "green" | "rose";

interface CustomElephantPreferences {
  name: string;
  workStyle: WorkStyle;
  color: ElephantColor;
  aboutUser: string;
  responsePreference: string;
  askBeforeGenerating: boolean;
  useForNewPrompts: boolean;
}

interface CustomizeElephantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STORAGE_KEY = "studio:custom-elephant";

const defaultPreferences: CustomElephantPreferences = {
  name: "",
  workStyle: "balanced",
  color: "black",
  aboutUser: "",
  responsePreference: "",
  askBeforeGenerating: true,
  useForNewPrompts: true,
};

const workStyleOptions: Array<{
  value: WorkStyle;
  label: string;
  description: string;
}> = [
  {
    value: "balanced",
    label: "均衡",
    description: "先给可用结果，再补关键取舍。",
  },
  {
    value: "concise",
    label: "简洁",
    description: "少解释，直接给可执行内容。",
  },
  {
    value: "creative",
    label: "创意",
    description: "多给画面、风格和变化方向。",
  },
  {
    value: "precise",
    label: "严谨",
    description: "优先检查约束、风险和细节。",
  },
];

const colorOptions: Array<{
  value: ElephantColor;
  label: string;
  className: string;
}> = [
  { value: "black", label: "墨黑", className: "bg-[#0d0d0d]" },
  { value: "blue", label: "湖蓝", className: "bg-[#2563eb]" },
  { value: "green", label: "松绿", className: "bg-[#15803d]" },
  { value: "rose", label: "玫瑰", className: "bg-[#be123c]" },
];

function isWorkStyle(value: unknown): value is WorkStyle {
  return (
    value === "balanced" ||
    value === "concise" ||
    value === "creative" ||
    value === "precise"
  );
}

function isElephantColor(value: unknown): value is ElephantColor {
  return value === "black" || value === "blue" || value === "green" || value === "rose";
}

function readPreferences(): CustomElephantPreferences {
  if (typeof window === "undefined") {
    return defaultPreferences;
  }

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return defaultPreferences;

    const parsed = JSON.parse(saved) as Partial<CustomElephantPreferences>;
    return {
      name: typeof parsed.name === "string" ? parsed.name : "",
      workStyle: isWorkStyle(parsed.workStyle) ? parsed.workStyle : "balanced",
      color: isElephantColor(parsed.color) ? parsed.color : "black",
      aboutUser: typeof parsed.aboutUser === "string" ? parsed.aboutUser : "",
      responsePreference:
        typeof parsed.responsePreference === "string"
          ? parsed.responsePreference
          : "",
      askBeforeGenerating:
        typeof parsed.askBeforeGenerating === "boolean"
          ? parsed.askBeforeGenerating
          : true,
      useForNewPrompts:
        typeof parsed.useForNewPrompts === "boolean"
          ? parsed.useForNewPrompts
          : true,
    };
  } catch {
    return defaultPreferences;
  }
}

function savePreferences(value: CustomElephantPreferences) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  window.dispatchEvent(
    new CustomEvent("studio:custom-elephant-changed", { detail: value })
  );
}

function TextAreaField({
  id,
  label,
  value,
  placeholder,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <label htmlFor={id} className="block">
      <span className="text-sm font-medium leading-5 text-[#0d0d0d]">
        {label}
      </span>
      <textarea
        id={id}
        value={value}
        maxLength={800}
        rows={4}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 min-h-[108px] w-full resize-none rounded-xl border border-[#d9d9d9] bg-white px-3 py-2.5 text-sm leading-6 text-[#0d0d0d] outline-none transition placeholder:text-[#9a9a9a] focus:border-[#0d0d0d] focus:ring-4 focus:ring-black/10"
      />
    </label>
  );
}

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

export function CustomizeElephantDialog({
  open,
  onOpenChange,
}: CustomizeElephantDialogProps) {
  const aboutId = React.useId();
  const responseId = React.useId();
  const [preferences, setPreferences] =
    React.useState<CustomElephantPreferences>(defaultPreferences);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;

    setPreferences(readPreferences());
    setLoaded(true);
  }, [open]);

  const updatePreferences = (
    next:
      | Partial<CustomElephantPreferences>
      | ((current: CustomElephantPreferences) => CustomElephantPreferences)
  ) => {
    setPreferences((current) =>
      typeof next === "function" ? next(current) : { ...current, ...next }
    );
  };

  const handleSave = () => {
    try {
      savePreferences(preferences);
      toast.success("自定义小象已保存。");
      onOpenChange(false);
    } catch {
      toast.error("无法保存偏好，请检查浏览器存储权限。");
    }
  };

  const handleReset = () => {
    setPreferences(defaultPreferences);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      window.dispatchEvent(new CustomEvent("studio:custom-elephant-changed"));
      toast.success("已恢复默认设置。");
    } catch {
      toast.error("无法重置偏好，请检查浏览器存储权限。");
    }
  };

  const selectedColor =
    colorOptions.find((item) => item.value === preferences.color) ??
    colorOptions[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-studio-dialog-surface="customize-elephant"
        className="max-h-[calc(100vh-32px)] gap-0 overflow-hidden rounded-2xl border border-[#d8d8d8] bg-white p-0 shadow-[0_24px_80px_rgba(0,0,0,0.18)] sm:max-w-[720px]"
      >
        <DialogTitle className="sr-only">自定义小象</DialogTitle>
        <div className="flex max-h-[calc(100vh-32px)] min-h-[520px] flex-col">
          <div className="border-b border-[#eeeeee] px-6 pb-4 pt-5">
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white",
                  selectedColor.className
                )}
              >
                象
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xl font-medium leading-7 text-[#0d0d0d]">
                  自定义小象
                </p>
                <p className="mt-1 text-sm leading-5 text-[#666]">
                  设置称呼、偏好和回答方式。
                </p>
              </div>
            </div>
          </div>

          <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <div className="grid gap-5">
              <label htmlFor="custom-elephant-name" className="block">
                <span className="text-sm font-medium leading-5 text-[#0d0d0d]">
                  小象应该怎么称呼你？
                </span>
                <input
                  id="custom-elephant-name"
                  value={preferences.name}
                  maxLength={80}
                  placeholder="例如：设计师、运营同学、店主"
                  onChange={(event) =>
                    updatePreferences({ name: event.target.value })
                  }
                  className="mt-2 h-10 w-full rounded-xl border border-[#d9d9d9] bg-white px-3 text-sm text-[#0d0d0d] outline-none transition placeholder:text-[#9a9a9a] focus:border-[#0d0d0d] focus:ring-4 focus:ring-black/10"
                />
              </label>

              <div>
                <div className="mb-2 flex items-center gap-2">
                  <Sparkles className="size-4 text-[#777]" strokeWidth={1.9} />
                  <p className="text-sm font-medium leading-5 text-[#0d0d0d]">
                    工作方式
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {workStyleOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() =>
                        updatePreferences({ workStyle: option.value })
                      }
                      className={cn(
                        "min-h-[76px] rounded-xl border px-3 py-2.5 text-left transition",
                        preferences.workStyle === option.value
                          ? "border-[#0d0d0d] bg-[#f7f7f7]"
                          : "border-[#e5e5e5] hover:bg-black/[0.03]"
                      )}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-[#0d0d0d]">
                          {option.label}
                        </span>
                        {preferences.workStyle === option.value && (
                          <Check className="size-4" strokeWidth={2} />
                        )}
                      </span>
                      <span className="mt-1 block text-sm leading-5 text-[#666]">
                        {option.description}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center gap-2">
                  <Palette className="size-4 text-[#777]" strokeWidth={1.9} />
                  <p className="text-sm font-medium leading-5 text-[#0d0d0d]">
                    头像颜色
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updatePreferences({ color: option.value })}
                      aria-pressed={preferences.color === option.value}
                      aria-label={option.label}
                      className={cn(
                        "flex h-9 items-center gap-2 rounded-full border px-2.5 pr-3 text-sm text-[#0d0d0d] transition hover:bg-black/[0.03]",
                        preferences.color === option.value
                          ? "border-[#0d0d0d]"
                          : "border-[#e5e5e5]"
                      )}
                    >
                      <span
                        className={cn("size-5 rounded-full", option.className)}
                      />
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <TextAreaField
                id={aboutId}
                label="小象应该了解你的哪些情况？"
                value={preferences.aboutUser}
                placeholder="例如：常做电商海报、偏好写实光影、需要中文提示词。"
                onChange={(aboutUser) => updatePreferences({ aboutUser })}
              />

              <TextAreaField
                id={responseId}
                label="希望小象怎样回应？"
                value={preferences.responsePreference}
                placeholder="例如：先给一版可直接生成的提示词，再列出 2 个可选风格。"
                onChange={(responsePreference) =>
                  updatePreferences({ responsePreference })
                }
              />

              <div className="divide-y divide-[#eeeeee] rounded-xl border border-[#eeeeee]">
                <div className="flex min-h-[58px] items-center justify-between gap-4 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-5 text-[#0d0d0d]">
                      生成前先确认缺失信息
                    </p>
                    <p className="mt-0.5 text-sm leading-5 text-[#777]">
                      主题、尺寸或风格不清楚时，优先追问。
                    </p>
                  </div>
                  <SettingsSwitch
                    checked={preferences.askBeforeGenerating}
                    label="生成前先确认缺失信息"
                    onChange={(askBeforeGenerating) =>
                      updatePreferences({ askBeforeGenerating })
                    }
                  />
                </div>
                <div className="flex min-h-[58px] items-center justify-between gap-4 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-5 text-[#0d0d0d]">
                      用于新的创作提示词
                    </p>
                    <p className="mt-0.5 text-sm leading-5 text-[#777]">
                      后续可以接到生图、生视频请求。
                    </p>
                  </div>
                  <SettingsSwitch
                    checked={preferences.useForNewPrompts}
                    label="用于新的创作提示词"
                    onChange={(useForNewPrompts) =>
                      updatePreferences({ useForNewPrompts })
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-[#eeeeee] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={handleReset}
              disabled={!loaded}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full px-4 text-sm font-medium text-[#555] transition hover:bg-black/[0.04] disabled:opacity-50"
            >
              <RotateCcw className="size-4" strokeWidth={1.9} />
              恢复默认
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="h-10 rounded-full border border-[#d9d9d9] px-4 text-sm font-medium text-[#0d0d0d] transition hover:bg-black/[0.04]"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="h-10 rounded-full bg-[#0d0d0d] px-4 text-sm font-medium text-white transition hover:bg-[#2a2a2a]"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
