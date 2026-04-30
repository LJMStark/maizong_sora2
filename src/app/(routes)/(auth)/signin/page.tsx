import { type Metadata } from "next";
import Link from "next/link";
import { Apple, Phone } from "lucide-react";
import SignInForm from "./form";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.signin");
  return {
    title: `${t("title")} - ChatGPT`,
  };
}

const socialButtons = [
  {
    label: "Continue with Google",
    icon: <span className="text-[24px] font-semibold text-[#4285f4]">G</span>,
  },
  {
    label: "Continue with Apple",
    icon: <Apple className="size-6 fill-black" strokeWidth={1.8} />,
  },
  {
    label: "Continue with Microsoft",
    icon: (
      <span className="grid size-5 grid-cols-2 gap-0.5">
        <span className="bg-[#f25022]" />
        <span className="bg-[#7fba00]" />
        <span className="bg-[#00a4ef]" />
        <span className="bg-[#ffb900]" />
      </span>
    ),
  },
  {
    label: "Continue with phone",
    icon: <Phone className="size-5" strokeWidth={2} />,
  },
];

export default async function SignInPage() {
  return (
    <main className="min-h-screen bg-white text-[#0d0d0d]">
      <Link
        href="/"
        className="fixed left-[30px] top-[28px] text-[30px] font-semibold leading-none"
      >
        ChatGPT
      </Link>

      <section className="mx-auto flex min-h-screen w-full max-w-[432px] flex-col items-center pt-[185px]">
        <h1 className="text-center text-[42px] font-normal leading-tight">
          Log in or sign up
        </h1>
        <p className="mt-5 max-w-[420px] text-center text-[22px] leading-8 text-[#555]">
          You&apos;ll get smarter responses and can upload files, images, and more.
        </p>

        <div className="mt-11 flex w-full flex-col gap-4">
          {socialButtons.map((button) => (
            <button
              key={button.label}
              type="button"
              className="relative flex h-16 w-full items-center justify-center rounded-full border border-[#d9d9d9] bg-white text-[20px] font-normal hover:bg-[#f7f7f7]"
            >
              <span className="absolute left-8 flex size-7 items-center justify-center">
                {button.icon}
              </span>
              {button.label}
            </button>
          ))}
        </div>

        <div className="my-9 flex w-full items-center gap-4 text-[17px] font-medium text-[#6d6d6d]">
          <span className="h-px flex-1 bg-[#e6e6e6]" />
          OR
          <span className="h-px flex-1 bg-[#e6e6e6]" />
        </div>

        <SignInForm />

        <div className="mt-16 flex items-center gap-4 text-[16px] text-[#5f5f5f]">
          <Link href="/" className="underline underline-offset-2">
            Terms of Use
          </Link>
          <span>|</span>
          <Link href="/" className="underline underline-offset-2">
            Privacy Policy
          </Link>
        </div>
      </section>
    </main>
  );
}
