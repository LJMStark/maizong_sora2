import { type Metadata } from "next";
import SignInForm from "./form";
import { getTranslations } from "next-intl/server";
import { SocialLoginOptions } from "../components/social-login-options";
import { AuthShell } from "../components/auth-shell";
import { getSocialProviderAvailability } from "@/lib/auth/social-providers";
import { ENABLE_ALTERNATIVE_LOGIN_OPTIONS } from "@/lib/auth/login-options";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.signin");
  return {
    title: t("title"),
  };
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams?: Promise<{ email?: string | string[] }>;
}) {
  const params = await searchParams;
  const emailParam = params?.email;
  const initialUsername = Array.isArray(emailParam)
    ? emailParam[0] ?? ""
    : emailParam ?? "";
  const socialProviders = getSocialProviderAvailability();

  return (
    <AuthShell title="欢迎回来">
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

      <SignInForm initialUsername={initialUsername} />
    </AuthShell>
  );
}
