import { type Metadata } from "next";
import ResetPasswordForm from "./form";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.resetPassword");
  return { title: `${t("title")} - Little Elephant Studio` };
}

export default async function ResetPasswordPage() {
  const t = await getTranslations("auth.resetPassword");
  const tCommon = await getTranslations("common.app");

  return (
    <div className="flex min-h-screen w-full">
      <div className="hidden lg:flex lg:w-1/2 bg-[#1a1a1a] flex-col justify-between p-12">
        <div>
          <Link href="/" className="flex items-center gap-2 text-white">
            <span className="material-symbols-outlined text-3xl">filter_vintage</span>
            <span className="font-serif text-2xl tracking-tight">{tCommon("name")}</span>
          </Link>
        </div>
        <div className="space-y-6">
          <h2 className="font-serif text-4xl text-white leading-tight">
            {t("subtitle")}
          </h2>
        </div>
        <div />
      </div>

      <div className="flex w-full lg:w-1/2 flex-col items-center justify-center p-8 bg-[#faf9f6]">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-12 justify-center">
            <span className="material-symbols-outlined text-3xl text-[#1a1a1a]">filter_vintage</span>
            <span className="font-serif text-2xl tracking-tight text-[#1a1a1a]">{tCommon("name")}</span>
          </div>

          <div className="bg-white rounded-2xl border border-[#e5e5e1] p-8 shadow-sm">
            <div className="text-center mb-8">
              <h1 className="font-serif text-3xl text-[#1a1a1a] mb-2">{t("title")}</h1>
              <p className="text-[#6b7280] text-sm">{t("subtitle")}</p>
            </div>
            <Suspense fallback={<div className="text-center text-[#6b7280]">...</div>}>
              <ResetPasswordForm />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
