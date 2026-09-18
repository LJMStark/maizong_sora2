import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Providers from "@/providers";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { APP_BRAND, APP_DESCRIPTION } from "@/lib/brand";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: {
    default: APP_BRAND,
    template: `%s | ${APP_BRAND}`,
  },
  description: APP_DESCRIPTION,
  keywords: ["AI 图像生成", "AI 视频生成", "电商工作室", "产品摄影", "视频创作", "Sora", "图像编辑"],
  authors: [{ name: APP_BRAND }],
  creator: APP_BRAND,
  publisher: APP_BRAND,
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'),
  // openGraph.images / twitter.images 故意不在这里声明：
  // `src/app/opengraph-image.png` 是 Next.js 的文件约定，会被自动接进两处并带上
  // 内容哈希。在此显式声明反而会覆盖掉它——早先这里写的 `/og-image.png`
  // 在 public/ 下并不存在，线上一直是 404。
  openGraph: {
    type: "website",
    locale: "zh_CN",
    siteName: APP_BRAND,
    title: APP_BRAND,
    description: APP_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: APP_BRAND,
    description: APP_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const messages = await getMessages();

  return (
    // lang 用 zh-Hans（语言 + 字体系统）而不是 next-intl 的 zh-CN：
    // 内容是简体中文但面向全球用户，zh-CN 会向搜索引擎隐含「定向中国大陆」。
    // Bing / Baidu 不读 hreflang，只看 html lang，所以这个属性得单独给对。
    <html lang="zh-Hans">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NextIntlClientProvider messages={messages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
