import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Providers from "@/providers";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { defaultLocale } from '@/i18n/config';

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
    default: "Little Elephant Studio - AI 驱动的创意工作室",
    template: "%s | Little Elephant Studio",
  },
  description: "AI 驱动的电商工作室 - 生成专业的产品图像和视频，提升您的品牌视觉效果",
  keywords: ["AI 图像生成", "AI 视频生成", "电商工作室", "产品摄影", "视频创作", "Sora", "图像编辑"],
  authors: [{ name: "Little Elephant Studio" }],
  creator: "Little Elephant Studio",
  publisher: "Little Elephant Studio",
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'),
  openGraph: {
    type: "website",
    locale: "zh_CN",
    url: "/",
    siteName: "Little Elephant Studio",
    title: "Little Elephant Studio - AI 驱动的创意工作室",
    description: "AI 驱动的电商工作室 - 生成专业的产品图像和视频",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Little Elephant Studio",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Little Elephant Studio - AI 驱动的创意工作室",
    description: "AI 驱动的电商工作室 - 生成专业的产品图像和视频",
    images: ["/og-image.png"],
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
    <html lang={defaultLocale}>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
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
