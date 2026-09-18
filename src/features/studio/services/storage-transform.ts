/**
 * Supabase Storage 图片变换（imgproxy）的参数与适用判定。
 *
 * 单独成文件是为了能在不加载 `@supabase/supabase-js` 与环境变量的前提下测试——
 * `storage-service.ts` 在模块加载期就要求 Supabase 配置齐全。
 *
 * ## 为什么用它，而不是 next/image
 *
 * 用户作品在私有桶里，对外靠 `createSignedUrl` 签发限时链接，而**签名 token
 * 每次请求都不同**（JWT 里带 exp）。`next/image` 按 URL 做缓存键，URL 每次都变
 * 就意味着每次访问都要重新下载 + 重新编码原图——比直接用 `<img>` 更糟。
 * 这正是这些位置当初写成裸 `<img>` 的原因。
 *
 * 2026-09-18 实测自建实例的 imgproxy 是开着的，且按 `Accept` 做 WebP 协商：
 *   原图                              2,647,468 B  image/png
 *   transform w=640                   1,083,306 B  image/png   ← 只缩放，仍是 PNG
 *   transform w=640 + Accept: webp       62,694 B  image/webp  ← 42 倍
 * 浏览器的 `<img>` 会自动带 `Accept: image/avif,image/webp,...`，所以拿到的是 WebP。
 *
 * 于是最省事的做法是**在签发链接时就把变换参数签进去**：不需要代理路由、
 * 不需要预生成缩略图、不需要改表、不需要引 sharp，签名有效期与安全模型完全不变。
 */

/**
 * 只设一档，宽度 1024。
 *
 * 全站最大的图片展示位是对话流里的成品图（约 360px 宽）与参考图预览（约 560px），
 * 1024 足以覆盖 2x 屏，**不会有可见的画质损失**。实测（源图 1024×1024 PNG）：
 *   w=480   49,682 B      w=640   74,460 B
 *   w=1024 148,960 B      w=1280 148,960 B（被源宽度截断）
 *   原图 2,647,468 B
 * 也就是说即使完全不缩放、仅仅换成 WebP，就已经是 18 倍的差距——
 * 省下的主要是 PNG 这个格式本身，而不是分辨率。
 *
 * 既然如此就不必按用途分档：分档会让每个列表接口多一轮签名往返，
 * 换来的只是 74KB 与 149KB 的区别，而两者相对 2.6MB 都可以忽略。
 */
export const THUMBNAIL_TRANSFORM = {
  width: 1024,
  quality: 80,
} as const;

/**
 * imgproxy 只能渲染位图。
 *
 * 排除 gif（变换会丢掉动画）与 svg（矢量图缩放无意义）。
 * 拿不准的一律返回 false——调用方会回落到原始链接，
 * 宁可多下载一次，也不要给出一个渲染时才 4xx 的地址。
 */
const TRANSFORMABLE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp", "avif"]);

export function isTransformableImagePath(path: string): boolean {
  if (!path) return false;

  const withoutQuery = path.split("?")[0];
  const filename = withoutQuery.split("/").pop() ?? "";
  const dot = filename.lastIndexOf(".");
  if (dot <= 0 || dot === filename.length - 1) return false;

  return TRANSFORMABLE_EXTENSIONS.has(filename.slice(dot + 1).toLowerCase());
}
