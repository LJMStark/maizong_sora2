import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';
import { buildRemoteImagePatterns } from "./src/lib/image-hosts";

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  devIndicators: false,
  env: {
    // 构建时固化，用于确认某次部署是否真的生效（/api/health 会回显）
    APP_BUILD_TIME: new Date().toISOString(),
    APP_COMMIT_SHA:
      process.env.ZEABUR_GIT_COMMIT_SHA ||
      process.env.VERCEL_GIT_COMMIT_SHA ||
      process.env.GIT_COMMIT_SHA ||
      "unknown",
  },
  images: {
    formats: ["image/avif", "image/webp"],
    // 灵感库配图等静态图基本不变，优化结果在边缘节点缓存 31 天
    minimumCacheTTL: 2678400,
    // 用户作品桶已转为私有，走 /object/sign/ 的限时链接；灵感库素材在公开桶。
    // 灵感库的 CDN 地址可以被 NEXT_PUBLIC_XIAOXIAODONG_GALLERY_BASE 覆盖到
    // 别的域名，所以白名单要一并覆盖它——漏掉的话 next/image 不会降级，
    // 而是直接报错、图片位置整片空白。推导逻辑见 src/lib/image-hosts.ts。
    remotePatterns: buildRemoteImagePatterns({
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      galleryBase: process.env.NEXT_PUBLIC_XIAOXIAODONG_GALLERY_BASE,
    }),
  },
  async headers() {
    return [
      {
        // 全站基础安全响应头。未加 CSP：需要逐条核对内联脚本与
        // 第三方来源，配错会直接白屏，应单独排期并在预览环境验证。
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
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
