import Link from "next/link";
import { APP_BRAND } from "@/lib/brand";

interface AuthShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  topOffset?: "default" | "compact";
}

export function AuthShell({
  title,
  subtitle,
  children,
  topOffset = "default",
}: AuthShellProps) {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#212121] text-white">
      <Link
        href="/"
        className="fixed left-1/2 top-10 z-10 flex h-8 -translate-x-1/2 items-center gap-2 rounded-lg px-1 text-[18px] font-semibold leading-none text-white transition hover:bg-white/[0.06] md:left-2 md:top-2 md:h-12 md:translate-x-0 md:px-2 md:text-[20px]"
        aria-label={`${APP_BRAND} 首页`}
      >
        <span className="flex size-7 items-center justify-center rounded-lg border border-white/15 bg-white text-[11px] font-semibold text-[#212121] md:size-8">
          象
        </span>
        <span>{APP_BRAND}</span>
      </Link>

      <section
        className={[
          "mx-auto flex min-h-screen w-[calc(100vw-32px)] max-w-[358px] flex-col items-center px-0 pb-8 md:w-full md:max-w-[340px]",
          topOffset === "compact" ? "pt-28 md:pt-36" : "pt-20 md:pt-[135px]",
        ].join(" ")}
      >
        <h1 className="w-full text-center text-[32px] font-bold leading-10 tracking-normal text-white">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-3 w-full text-center text-base leading-7 text-[#cdd5e0]">
            {subtitle}
          </p>
        )}

        <div className="mt-8 w-full min-w-0">{children}</div>

        <div className="mt-auto flex items-center gap-4 pt-8 text-sm text-[#cdd5e0]">
          <Link href="/" className="hover:underline">
            服务条款
          </Link>
          <span>|</span>
          <Link href="/" className="hover:underline">
            隐私政策
          </Link>
        </div>
      </section>
    </main>
  );
}
