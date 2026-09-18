"use client";

import { useEffect } from "react";
import Link from "next/link";
import { APP_BRAND } from "@/lib/brand";

/**
 * 路由段错误边界。没有它的话，生产环境任何渲染异常都会落到 Next 的默认页
 * （"Application error: a server-side exception has occurred"），对付费产品来说
 * 既不可读也给不出退路。
 *
 * `digest` 是 Next 对服务端错误做的哈希——真实堆栈只在服务端日志里
 * （见 `src/instrumentation.ts` 的 `onRequestError`）。把它显示出来，
 * 用户报障时报这一串就能对上日志。
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[RouteError]", error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#212121] px-6 text-white">
      <p className="font-mono text-[13px] tracking-[0.3em] text-white/35">
        ERROR
      </p>
      <h1 className="mt-5 text-center text-[28px] font-bold leading-tight md:text-[34px]">
        这个页面出了点问题
      </h1>
      <p className="mt-3 max-w-md text-center text-[15px] leading-7 text-[#cdd5e0]">
        请先重试一次。如果反复出现，把下面的错误编号发给我们，能直接定位到日志。
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-xl bg-white px-5 py-2.5 text-[15px] font-semibold text-[#212121] transition hover:bg-white/90 active:scale-[0.98]"
        >
          重试
        </button>
        <Link
          href="/studio"
          className="rounded-xl border border-white/15 px-5 py-2.5 text-[15px] text-white transition hover:bg-white/[0.06] active:scale-[0.98]"
        >
          回到工作台
        </Link>
      </div>

      {error.digest && (
        <p className="mt-10 font-mono text-[12px] text-white/30">
          错误编号 {error.digest}
        </p>
      )}
      <p className="mt-3 text-[13px] text-white/35">{APP_BRAND}</p>
    </main>
  );
}
