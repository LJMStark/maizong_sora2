import Link from "next/link";
import { APP_BRAND } from "@/lib/brand";
import { LEGAL_LAST_UPDATED } from "@/lib/legal-contact";

const NAV = [
  { href: "/terms", label: "服务条款" },
  { href: "/privacy", label: "隐私政策" },
  { href: "/takedown", label: "侵权与滥用举报" },
] as const;

export default function LegalLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-[#212121] text-white">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-[#212121]/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-5 py-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-[17px] font-semibold leading-none transition hover:opacity-80"
            aria-label={`${APP_BRAND} 首页`}
          >
            <span className="flex size-7 items-center justify-center rounded-lg border border-white/15 bg-white text-[11px] font-semibold text-[#212121]">
              象
            </span>
            <span>{APP_BRAND}</span>
          </Link>
          <nav aria-label="法务文档" className="ml-auto flex gap-1 text-[13px]">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-2.5 py-1.5 text-[#cdd5e0] transition hover:bg-white/[0.06] hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 pb-24 pt-10">
        <article
          className={[
            "text-[15px] leading-7 text-[#cdd5e0]",
            // 标题层级靠字号对比拉开，正文行高放宽到 1.85 便于长文阅读
            "[&_h1]:mb-2 [&_h1]:text-[32px] [&_h1]:font-bold [&_h1]:leading-tight [&_h1]:text-white",
            "[&_h2]:mb-3 [&_h2]:mt-10 [&_h2]:border-t [&_h2]:border-white/10 [&_h2]:pt-8 [&_h2]:text-[20px] [&_h2]:font-semibold [&_h2]:text-white",
            "[&_h3]:mb-2 [&_h3]:mt-6 [&_h3]:text-[16px] [&_h3]:font-semibold [&_h3]:text-white",
            "[&_p]:my-3 [&_p]:leading-[1.85]",
            "[&_ul]:my-3 [&_ul]:space-y-2 [&_ul]:pl-5",
            "[&_ol]:my-3 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-5",
            "[&_li]:leading-[1.85] [&_ul>li]:list-disc",
            "[&_strong]:font-semibold [&_strong]:text-white",
            "[&_a]:text-white [&_a]:underline [&_a]:underline-offset-2 [&_a:hover]:opacity-80",
            "[&_code]:rounded [&_code]:bg-white/[0.08] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[13px]",
          ].join(" ")}
        >
          {children}
          <p className="mt-12 border-t border-white/10 pt-6 text-[13px] text-white/45">
            最后更新：{LEGAL_LAST_UPDATED}
          </p>
        </article>
      </main>
    </div>
  );
}
