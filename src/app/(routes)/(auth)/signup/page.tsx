import { type Metadata } from "next";
import Link from "next/link";
import SignUpForm from "./form";
import { getTranslations } from "next-intl/server";
import { SocialLoginOptions } from "../components/social-login-options";
import { AuthShell } from "../components/auth-shell";
import { getSocialProviderAvailability } from "@/lib/auth/social-providers";
import { ENABLE_ALTERNATIVE_LOGIN_OPTIONS } from "@/lib/auth/login-options";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.signup");
  return {
    title: t("title"),
  };
}

export default async function SignUpPage() {
  const t = await getTranslations("auth.signup");
  const socialProviders = getSocialProviderAvailability();

  return (
    <AuthShell title={t("title")}>
      {ENABLE_ALTERNATIVE_LOGIN_OPTIONS && (
        <>
          <SocialLoginOptions providers={socialProviders} />
          <div className="my-6 flex w-full min-w-0 items-center gap-4 text-sm font-medium uppercase text-[#cdd5e0]">
            <span className="h-px flex-1 bg-white/15" />
            或
            <span className="h-px flex-1 bg-white/15" />
          </div>
        </>
      )}

      <div className="w-full min-w-0">
        <SignUpForm />
      </div>

      <p className="mt-5 text-center text-sm text-[#eef2ff]">
        {t("hasAccount")}{" "}
        <Link
          href="/signin"
          className="font-medium text-[#a6baff] underline-offset-4 hover:underline"
        >
          {t("signinLink")}
        </Link>
      </p>
    </AuthShell>
  );
}
