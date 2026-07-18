"use client";

import React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function IconHint({
  label,
  className,
  disabled,
  children,
}: {
  label: string;
  className?: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span className={cn("group/hint relative inline-flex", className)}>
      {children}
      {!disabled && (
        <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-[#0d0d0d] px-2 py-1 text-xs text-white shadow-lg group-hover/hint:block group-focus-within/hint:block">
          {label}
        </span>
      )}
    </span>
  );
}

export function SettingsLoginCard({
  hasSession,
  title,
  onLogin,
  onSignup,
}: {
  hasSession: boolean;
  title: string;
  onLogin: () => void;
  onSignup: () => void;
}) {
  if (hasSession) return null;

  return (
    <div className="rounded-xl border border-black/10 bg-[#f7f7f7] p-3">
      <div>
        <p className="text-sm font-medium text-[#0d0d0d]">
          {title}
        </p>
        <p className="mt-1 text-xs leading-5 text-[#666]">
          保存设置、读取作品库，并同步最近创作记录。
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onLogin}
            className="h-8 rounded-full bg-[#0d0d0d] px-3.5 text-sm font-medium text-white hover:bg-[#2a2a2a]"
          >
            登录
          </button>
          <button
            type="button"
            onClick={onSignup}
            className="h-8 rounded-full border border-black/10 bg-white px-3.5 text-sm font-medium text-[#0d0d0d] hover:bg-black/[0.04]"
          >
            免费注册
          </button>
        </div>
      </div>
    </div>
  );
}

export function ComposerNotice({ compact }: { compact: boolean }) {
  return (
    <p
      className={cn(
        "mx-auto max-w-[720px] px-4 text-center text-xs leading-5 text-[#8a8a8a]",
        compact ? "mt-3 md:mt-[54px]" : "mt-2"
      )}
    >
      生成内容可能不准确，重要用途请人工确认。
    </p>
  );
}

export function SettingsOption({
  label,
  description,
  active,
  disabled,
  onClick,
}: {
  label: string;
  description?: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex min-h-10 w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left transition",
        disabled
          ? "cursor-not-allowed text-[#b5b5b5]"
          : "text-[#0d0d0d] hover:bg-black/[0.04]"
      )}
    >
      <span className="flex size-4 shrink-0 items-center justify-center">
        {active && <Check className="size-3.5" strokeWidth={2} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{label}</span>
        {description && (
          <span className="block text-xs leading-4 text-[#777]">
            {description}
          </span>
        )}
      </span>
    </button>
  );
}

export function AttachmentMenuItem({
  icon,
  label,
  description,
  trailing,
  muted,
  disabled,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  description?: string;
  trailing?: React.ReactNode;
  muted?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex h-9 w-full items-center gap-2.5 rounded-[10px] px-2.5 text-left transition",
        disabled
          ? "cursor-not-allowed text-[#b5b5b5]"
          : muted
            ? "text-[#8a8a8a] hover:bg-black/[0.04]"
            : "text-[#0d0d0d] hover:bg-black/[0.04]"
      )}
    >
      <span
        className={cn(
          "flex size-5 shrink-0 items-center justify-center",
          muted || disabled ? "text-[#9b9b9b]" : "text-[#555]"
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-normal leading-5">{label}</span>
        {description && (
          <span className="mt-0.5 block text-xs leading-4 text-[#777]">
            {description}
          </span>
        )}
      </span>
      {trailing && (
        <span className="shrink-0 text-xs text-[#777]">
          {trailing}
        </span>
      )}
    </button>
  );
}
