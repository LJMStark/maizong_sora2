import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  devIndicators: false,
  images: {
    formats: ["image/avif", "image/webp"],
    // 灵感库配图等静态图基本不变，优化结果在边缘节点缓存 31 天
    minimumCacheTTL: 2678400,
  },
  async headers() {
    return [
      {
        // 灵感库配图：文件名按索引固定但内容偶尔随采集更新，
        // 采用 1 天强缓存 + 30 天 stale-while-revalidate，不用 immutable
        source: "/studio-showcase/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=2592000",
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
