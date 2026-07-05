import { Apple, Phone } from "lucide-react";
import { SocialLoginButton } from "./social-login-button";
import { GoogleMark, MicrosoftMark } from "@/components/social-provider-icons";
import type {
  SocialAuthProviderId,
  SocialProviderAvailability,
} from "@/lib/auth/social-providers";

const socialButtons = [
  {
    label: "继续使用 Google",
    provider: "google",
    icon: <GoogleMark />,
  },
  {
    label: "继续使用 Apple",
    provider: "apple",
    icon: <Apple className="size-6 fill-white text-white" strokeWidth={1.8} />,
  },
  {
    label: "继续使用 Microsoft",
    provider: "microsoft",
    icon: <MicrosoftMark />,
  },
  {
    label: "继续使用手机号",
    icon: <Phone className="size-5 text-white" strokeWidth={2} />,
  },
] satisfies Array<{
  label: string;
  icon: React.ReactNode;
  provider?: SocialAuthProviderId;
}>;

export function SocialLoginOptions({
  providers,
}: {
  providers: SocialProviderAvailability;
}) {
  return (
    <div className="flex w-full flex-col gap-3">
      {socialButtons.map((button) => (
        <SocialLoginButton
          key={button.label}
          label={button.label}
          icon={button.icon}
          provider={button.provider}
          enabled={button.provider ? providers[button.provider] : false}
        />
      ))}
    </div>
  );
}
