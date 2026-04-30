import { type Metadata } from "next";
import Link from "next/link";
import SignUpForm from "./form";
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth.signup');
  return {
    title: `${t('title')} - ChatGPT`,
  };
}

export default async function SignUpPage() {
  const t = await getTranslations('auth.signup');

  return (
    <main className="min-h-screen bg-white text-[#0d0d0d]">
      <Link
        href="/"
        className="fixed left-[30px] top-[28px] text-[30px] font-semibold leading-none"
      >
        ChatGPT
      </Link>

      <section className="mx-auto flex min-h-screen w-full max-w-[432px] flex-col items-center px-5 pt-[130px] pb-12">
        <h1 className="text-center text-[42px] font-normal leading-tight">
          {t("title")}
        </h1>
        <p className="mt-5 max-w-[420px] text-center text-[22px] leading-8 text-[#555]">
          {t("subtitle")}
        </p>

        <div className="mt-11 w-full">
          <SignUpForm />
        </div>

        <p className="mt-8 text-center text-sm text-[#5f5f5f]">
          {t("hasAccount")}{" "}
          <Link
            href="/signin"
            className="font-medium text-[#0d0d0d] underline-offset-4 hover:underline"
          >
            {t("signinLink")}
          </Link>
        </p>
      </section>
    </main>
  );
}
