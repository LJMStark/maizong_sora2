import { type Metadata } from "next";
import ForgotPasswordForm from "./form";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.forgotPassword");
  return { title: t("title") };
}

export default async function ForgotPasswordPage() {
  const t = await getTranslations("auth.forgotPassword");

  return (
    <main className="min-h-screen bg-white text-[#0d0d0d]">
      <Link
        href="/"
        className="fixed left-[30px] top-[28px] text-[30px] font-semibold leading-none"
      >
        小象万象
      </Link>

      <section className="mx-auto flex min-h-screen w-full max-w-[432px] flex-col items-center px-5 pt-[185px]">
        <h1 className="text-center text-[42px] font-normal leading-tight">
          {t("title")}
        </h1>
        <p className="mt-5 max-w-[420px] text-center text-[22px] leading-8 text-[#555]">
          {t("subtitle")}
        </p>

        <div className="mt-11 w-full">
          <ForgotPasswordForm />
        </div>
      </section>
    </main>
  );
}
