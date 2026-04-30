import { type Metadata } from "next";
import ResetPasswordForm from "./form";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.resetPassword");
  return { title: `${t("title")} - ChatGPT` };
}

export default async function ResetPasswordPage() {
  const t = await getTranslations("auth.resetPassword");

  return (
    <main className="min-h-screen bg-white text-[#0d0d0d]">
      <Link
        href="/"
        className="fixed left-[30px] top-[28px] text-[30px] font-semibold leading-none"
      >
        ChatGPT
      </Link>

      <section className="mx-auto flex min-h-screen w-full max-w-[432px] flex-col items-center px-5 pt-[185px]">
        <h1 className="text-center text-[42px] font-normal leading-tight">
          {t("title")}
        </h1>
        <p className="mt-5 max-w-[420px] text-center text-[22px] leading-8 text-[#555]">
          {t("subtitle")}
        </p>

        <div className="mt-11 w-full">
          <Suspense fallback={<div className="text-center text-[#6b7280]">...</div>}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
