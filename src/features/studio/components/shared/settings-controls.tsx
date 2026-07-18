"use client";

import { cn } from "@/lib/utils";

type SettingsSwitchSize = "sm" | "md";

interface SettingsSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  size?: SettingsSwitchSize;
}

const TRACK_CLASSES: Record<SettingsSwitchSize, string> = {
  sm: "relative h-6 w-10 rounded-full transition-colors",
  md: "relative h-7 w-12 rounded-full transition",
};

const THUMB_CLASSES: Record<SettingsSwitchSize, string> = {
  sm: "absolute top-1 size-4 rounded-full bg-white shadow-sm transition-transform",
  md: "absolute top-1 flex size-5 items-center justify-center rounded-full bg-white shadow-sm transition-transform",
};

const THUMB_TRANSLATE: Record<
  SettingsSwitchSize,
  { checked: string; unchecked: string }
> = {
  sm: { checked: "translate-x-5", unchecked: "translate-x-1" },
  md: { checked: "translate-x-6", unchecked: "translate-x-1" },
};

export function SettingsSwitch({
  checked,
  onChange,
  label,
  size = "md",
}: SettingsSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        TRACK_CLASSES[size],
        checked ? "bg-[#0d0d0d]" : "bg-[#d9d9d9]"
      )}
    >
      <span
        className={cn(
          THUMB_CLASSES[size],
          checked ? THUMB_TRANSLATE[size].checked : THUMB_TRANSLATE[size].unchecked
        )}
      />
    </button>
  );
}
