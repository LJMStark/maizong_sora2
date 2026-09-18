import type { Metadata } from "next";
import Link from "next/link";
import { APP_BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: "页面不存在",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#212121] px-6 text-white">
      <p className="font-mono text-[13px] tracking-[0.3em] text-white/35">404</p>
      <h1 className="mt-5 text-center text-[28px] font-bold leading-tight md:text-[34px]">
        这个页面不存在
      </h1>
      <p className="mt-3 max-w-sm text-center text-[15px] leading-7 text-[#cdd5e0]">
        链接可能已经失效，或者地址输错了一个字符。
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/studio"
          className="rounded-xl bg-white px-5 py-2.5 text-[15px] font-semibold text-[#212121] transition hover:bg-white/90 active:scale-[0.98]"
        >
          回到工作台
        </Link>
        <Link
          href="/studio/video"
          className="rounded-xl border border-white/15 px-5 py-2.5 text-[15px] text-white transition hover:bg-white/[0.06] active:scale-[0.98]"
        >
          去生成视频
        </Link>
      </div>

      <p className="mt-12 text-[13px] text-white/35">{APP_BRAND}</p>
    </main>
  );
}
