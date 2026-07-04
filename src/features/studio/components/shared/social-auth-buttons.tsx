"use client";

import React from "react";
import { Apple, Phone } from "lucide-react";
import { toast } from "sonner";
import { signIn } from "@/lib/auth/client";
import type {
  SocialAuthProviderId,
  SocialProviderAvailability,
} from "@/lib/auth/social-providers";

function GoogleMark() {
  return (
    <svg className="size-5" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285f4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34a853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#fbbc05"
        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"
      />
      <path
        fill="#ea4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}

type SocialAuthButtonConfig = {
  label: string;
  provider?: SocialAuthProviderId;
  icon: React.ReactNode;
};

const buttons: SocialAuthButtonConfig[] = [
  {
    label: "继续使用 Google",
    provider: "google",
    icon: <GoogleMark />,
  },
  {
    label: "继续使用 Apple",
    provider: "apple",
    icon: <Apple className="size-5 fill-black" strokeWidth={1.8} />,
  },
  {
    label: "继续使用 Microsoft",
    provider: "microsoft",
    icon: (
      <span className="grid size-4 grid-cols-2 gap-0.5" aria-hidden="true">
        <span className="bg-[#f25022]" />
        <span className="bg-[#7fba00]" />
        <span className="bg-[#00a4ef]" />
        <span className="bg-[#ffb900]" />
      </span>
    ),
  },
  {
    label: "继续使用手机号",
    icon: <Phone className="size-4" strokeWidth={2} />,
  },
];

const emptyProviders: SocialProviderAvailability = {
  google: false,
  apple: false,
  microsoft: false,
};

export function SocialAuthButtons() {
  const [providers, setProviders] =
    React.useState<SocialProviderAvailability>(emptyProviders);

  React.useEffect(() => {
    let cancelled = false;

    fetch("/api/auth/social-providers")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (cancelled || !data?.providers) return;
        setProviders({
          ...emptyProviders,
          ...data.providers,
        });
      })
      .catch(() => {
        if (!cancelled) setProviders(emptyProviders);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleClick = async (button: SocialAuthButtonConfig) => {
    if (!button.provider) {
      toast.info("手机号登录需要短信服务配置，当前请使用邮箱继续。");
      return;
    }

    if (!providers[button.provider]) {
      toast.info(
        `${button.label.replace("继续使用 ", "")} 登录尚未配置，请使用邮箱继续。`
      );
      return;
    }

    const response = await signIn.social({
      provider: button.provider,
      callbackURL: "/studio",
    });

    if (response.error) {
      toast.error(response.error.message || "第三方登录启动失败，请稍后重试。");
    }
  };

  return (
    <div className="mt-6 flex flex-col gap-2.5">
      {buttons.map((button) => {
        const isConfigured = Boolean(button.provider && providers[button.provider]);
        const statusLabel = isConfigured ? "已配置" : "未配置";

        return (
          <button
            key={button.label}
            type="button"
            onClick={() => void handleClick(button)}
            className="flex h-12 w-full items-center justify-between gap-3 rounded-full border border-[#d9d9d9] bg-white px-4 text-left text-[#0d0d0d] transition hover:bg-[#f7f7f7]"
            aria-label={`${button.label}，${statusLabel}`}
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="flex size-5 shrink-0 items-center justify-center">
                {button.icon}
              </span>
              <span className="min-w-0 truncate text-[15px]">{button.label}</span>
            </span>
            <span
              className={
                isConfigured
                  ? "shrink-0 rounded-full bg-[#0d0d0d] px-2.5 py-1 text-xs text-white"
                  : "shrink-0 rounded-full border border-[#dddddd] px-2.5 py-1 text-xs text-[#777]"
              }
            >
              {statusLabel}
            </span>
          </button>
        );
      })}
    </div>
  );
}
