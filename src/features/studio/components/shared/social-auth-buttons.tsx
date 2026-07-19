"use client";

import React from "react";
import { Apple, Phone } from "lucide-react";
import { toast } from "sonner";
import { signIn } from "@/lib/auth/client";
import { GoogleMark, MicrosoftMark } from "@/components/social-provider-icons";
import type {
  SocialAuthProviderId,
  SocialProviderAvailability,
} from "@/lib/auth/social-providers";
import { ENABLE_ALTERNATIVE_LOGIN_OPTIONS } from "@/lib/auth/login-options";

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
    icon: <MicrosoftMark />,
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

function EnabledSocialAuthButtons() {
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

export function SocialAuthButtons() {
  if (!ENABLE_ALTERNATIVE_LOGIN_OPTIONS) return null;

  return <EnabledSocialAuthButtons />;
}
