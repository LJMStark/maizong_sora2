import { type Metadata } from "next";
import ForgotPasswordForm from "./form";
import { getTranslations } from "next-intl/server";
import { AuthShell } from "../components/auth-shell";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.forgotPassword");
  return { title: t("title") };
}

export default async function ForgotPasswordPage() {
  const t = await getTranslations("auth.forgotPassword");

  return (
    <AuthShell
      title={t("title")}
      subtitle={t("subtitle")}
      topOffset="compact"
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
