import type { MetadataRoute } from "next";
import { getAppBaseUrl } from "@/lib/config";

/**
 * 只收录匿名可直接打开、且返回 200 的页面。
 *
 * 刻意没有收录 `/`：它现在是 `redirect("/studio")`，在 sitemap 里放一个 307
 * 会在 Search Console 里被记为「重定向错误」。等首页换成真正的着陆页后再加进来。
 *
 * `/sitemap.xml` 同样需要在 `src/proxy.ts` 的 matcher 里被排除。
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getAppBaseUrl();
  const lastModified = new Date();

  return [
    {
      url: `${baseUrl}/studio`,
      lastModified,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/studio/video`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/studio/ppt`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/takedown`,
      lastModified,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
