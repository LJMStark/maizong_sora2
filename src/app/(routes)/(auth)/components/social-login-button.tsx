"use client";

import { type ReactNode } from "react";
import { toast } from "sonner";
import { signIn } from "@/lib/auth/client";
import type { SocialAuthProviderId } from "@/lib/auth/social-providers";

export function SocialLoginButton({
  label,
  icon,
  provider,
  enabled,
}: {
  label: string;
  icon: ReactNode;
  provider?: SocialAuthProviderId;
  enabled?: boolean;
}) {
  const isConfigured = Boolean(provider && enabled);
  const statusLabel = isConfigured ? "已配置" : "未配置";

  const handleClick = async () => {
    if (!provider) {
      toast.info("手机号登录需要短信服务配置，当前请使用用户名或邮箱继续。");
      return;
    }

    if (!enabled) {
      toast.info(`${label.replace("继续使用 ", "")} 登录尚未配置，请使用用户名或邮箱继续。`);
      return;
    }

    const response = await signIn.social({
      provider,
      callbackURL: "/studio",
    });

    if (response.error) {
      toast.error(response.error.message || "第三方登录启动失败，请稍后重试。");
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      className="group flex h-[52px] w-full items-center justify-between gap-3 rounded-full border border-white/15 bg-transparent px-4 text-left text-[#eef2ff] transition hover:bg-white/[0.06]"
      aria-label={`${label}，${statusLabel}`}
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className="flex size-5 shrink-0 items-center justify-center">{icon}</span>
        <span className="min-w-0 truncate text-[16px] font-normal">{label}</span>
      </span>
      <span
        className={
          isConfigured
            ? "shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/70"
            : "shrink-0 rounded-full border border-white/10 px-2.5 py-1 text-xs text-white/45"
        }
      >
        {statusLabel}
      </span>
    </button>
  );
}
