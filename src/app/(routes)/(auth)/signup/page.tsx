import { type Metadata } from "next";
import Link from "next/link";
import SignUpForm from "./form";
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth.signup');
  return {
    title: `${t('title')} - Little Elephant Studio`,
  };
}

export default async function SignUpPage() {
  const t = await getTranslations('auth.signup');
  const tCommon = await getTranslations('common.app');
  const tNav = await getTranslations('studio.nav');

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
            {t('features.title')}
          </p>
          <div className="flex flex-col gap-3 text-[#9ca3af]">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[#8C7355]">check_circle</span>
              <span>{t('features.imageEnhancement')}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[#8C7355]">check_circle</span>
              <span>{t('features.videoCreation')}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[#8C7355]">check_circle</span>
              <span>{t('features.unlimitedStorage')}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-8 text-[#6b7280] text-sm">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">image</span>
            <span>{tNav('imageWorkshop')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">video_camera_back</span>
            <span>{tNav('videoWorkshop')}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">grid_view</span>
            <span>{tNav('collections')}</span>
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

            <SignUpForm />

            <div className="mt-6 pt-6 border-t border-[#e5e5e1]">
              <p className="text-center text-sm text-[#6b7280]">
                {t('hasAccount')}{" "}
                <Link
                  href="/signin"
                  className="font-semibold text-[#1a1a1a] hover:text-[#8C7355] transition-colors"
                >
                  {t('signinLink')}
                </Link>
              </p>
            </div>
          </div>

          <p className="text-center text-xs text-[#9ca3af] mt-8">
            By creating an account, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}
