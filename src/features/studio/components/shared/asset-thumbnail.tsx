"use client";

import { useState } from "react";

interface AssetThumbnailProps {
  /** 服务端签发的变换小图。imgproxy 不可用或该对象不是位图时为空。 */
  thumbnailUrl?: string | null;
  /** 原图链接，作为回退。 */
  fullUrl?: string | null;
  alt: string;
  className?: string;
}

/**
 * 宫格里的作品缩略图。
 *
 * 优先用服务端带图片变换签发的小图（实测 2.6MB PNG -> 62KB WebP），
 * 失败时回落到原图——变换走的是 Supabase 的 imgproxy，它是独立服务，
 * 可能没部署或临时不可用，这种时候宁可多下载一次也不能显示破图。
 *
 * 用 `<img>` 而不是 `next/image` 是有意的：这些是私有桶的签名链接，
 * **token 每次请求都会变**，而 next/image 按 URL 做缓存键，
 * URL 每次都变就等于每次访问都重新下载并重新编码一次原图——比现在更糟。
 * 优化因此放在签发那一侧完成（见 `services/storage-transform.ts`）。
 */
export function AssetThumbnail({
  thumbnailUrl,
  fullUrl,
  alt,
  className,
}: AssetThumbnailProps) {
  // 只记「缩略图失败过」，不把 src 存进 state——
  // 列表会轮询刷新、签名链接随之更新，存 src 会把旧链接钉死。
  const [thumbnailFailed, setThumbnailFailed] = useState(false);

  const src = !thumbnailFailed && thumbnailUrl ? thumbnailUrl : fullUrl;
  if (!src) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- 见上方注释：签名链接每次都变，next/image 无法缓存
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={className}
      onError={() => {
        if (!thumbnailFailed && thumbnailUrl && fullUrl) {
          setThumbnailFailed(true);
        }
      }}
    />
  );
}
