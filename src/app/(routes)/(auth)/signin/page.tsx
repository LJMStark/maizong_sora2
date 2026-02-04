import { type Metadata } from "next";
import SignInForm from "./form";
import Link from "next/link";
import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth.signin');
  return {
    title: `${t('title')} - Little Elephant Studio`,
  };
}

export default async function SignInPage() {
  const t = await getTranslations('auth.signin');
  const tCommon = await getTranslations('common.app');

  return (
    <div className="flex min-h-screen w-full">
      <div className="hidden lg:flex lg:w-1/2 bg-[#1a1a1a] flex-col justify-between p-12">
        <div>
          <Link href="/" className="flex items-center gap-2 text-white">
            <span className="material-symbols-outlined text-3xl">filter_vintage</span>
            <span className="font-serif text-2xl tracking-tight">{tCommon('name')}</span>
          </Link>
        </div>
        <div className="space-y-6">
          <h2 className="font-serif text-4xl text-white leading-tight">
            {t('subtitle')}
          </h2>
          <p className="text-[#9ca3af] text-lg max-w-md">
            {tCommon('description')}
          </p>
        </div>
        <div className="flex items-center gap-8 text-[#6b7280] text-sm">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">image</span>
            <span>{await getTranslations('studio.nav').then(t => t('imageWorkshop'))}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">video_camera_back</span>
            <span>{await getTranslations('studio.nav').then(t => t('videoWorkshop'))}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">grid_view</span>
            <span>{await getTranslations('studio.nav').then(t => t('collections'))}</span>
          </div>
        </div>
      </div>

      <div className="flex w-full lg:w-1/2 flex-col items-center justify-center p-8 bg-[#faf9f6]">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-12 justify-center">
            <span className="material-symbols-outlined text-3xl text-[#1a1a1a]">filter_vintage</span>
            <span className="font-serif text-2xl tracking-tight text-[#1a1a1a]">{tCommon('name')}</span>
          </div>

          <div className="bg-white rounded-2xl border border-[#e5e5e1] p-8 shadow-sm">
            <div className="text-center mb-8">
              <h1 className="font-serif text-3xl text-[#1a1a1a] mb-2">{t('title')}</h1>
              <p className="text-[#6b7280] text-sm">{t('subtitle')}</p>
            </div>

            <SignInForm />

            <div className="mt-6 pt-6 border-t border-[#e5e5e1]">
              <p className="text-center text-sm text-[#6b7280]">
                {t('noAccount')}{" "}
                <Link
                  href="/signup"
                  className="font-semibold text-[#1a1a1a] hover:text-[#8C7355] transition-colors"
                >
                  {t('signupLink')}
                </Link>
              </p>
            </div>
          </div>

          <p className="text-center text-xs text-[#9ca3af] mt-8">
            登录即表示您同意我们的服务条款和隐私政策
          </p>
        </div>
      </div>
    </div>
  );
}
