import type { MetadataRoute } from "next";
import { getAppBaseUrl } from "@/lib/config";

/**
 * 注意：`/robots.txt` 必须同时在 `src/proxy.ts` 的 matcher 里被排除。
 * proxy 对不在 `publicRoutes` 的路径一律 307 到 `/signin`，而爬虫是匿名请求
 * ——漏掉排除的话，这个文件生成了也只会被重定向走。
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = getAppBaseUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          // 登录后才有内容的页面，索引了只会得到空壳。
          // 与 `authGatedRoutePrefixes`（src/routes.ts）保持一致。
          "/studio/admin",
          "/studio/assets",
          "/studio/profile",
          "/studio/subscription",
          // 认证流程页没有索引价值，且 /reset-password 带一次性 token
          "/signin",
          "/signup",
          "/forgot-password",
          "/reset-password",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
