import { type Metadata } from "next";
import ResetPasswordForm from "./form";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { AuthShell } from "../components/auth-shell";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.resetPassword");
  return { title: t("title") };
}

export default async function ResetPasswordPage() {
  const t = await getTranslations("auth.resetPassword");

  return (
    <AuthShell
      title={t("title")}
      subtitle={t("subtitle")}
      topOffset="compact"
    >
      <Suspense fallback={<div className="text-center text-[#6b7280]">...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
