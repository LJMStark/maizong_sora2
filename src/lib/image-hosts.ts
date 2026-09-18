/**
 * `next/image` 的远程域名白名单推导。
 *
 * 单独成文件是因为 `next.config.ts` 不便于直接单测，而这段逻辑错了的后果很具体：
 * 域名不在白名单时 `next/image` 不会降级，而是直接报错、图片位置整片空白。
 * 灵感库的 CDN 地址可以被 `NEXT_PUBLIC_XIAOXIAODONG_GALLERY_BASE` 覆盖到任意域名，
 * 所以白名单必须同时覆盖它，不能只写 Supabase 那一个。
 */

export interface RemoteImagePattern {
  protocol: "https";
  hostname: string;
  pathname: string;
}

/** 私有桶签名链接与公开桶素材，两种路径都要放行。 */
const SUPABASE_PATHNAMES = [
  "/storage/v1/object/sign/**",
  "/storage/v1/object/public/**",
];

function hostOf(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    // 只放行 https：http 源会让整页降级成混合内容
    return url.protocol === "https:" ? url.hostname : null;
  } catch {
    return null;
  }
}

/**
 * 由 Supabase 地址与灵感库 CDN 地址推导出 `images.remotePatterns`。
 * 两者通常是同一个域名，去重后只会产生一组规则。
 */
export function buildRemoteImagePatterns(env: {
  supabaseUrl?: string;
  galleryBase?: string;
}): RemoteImagePattern[] {
  const hosts = new Set<string>();
  for (const value of [env.supabaseUrl, env.galleryBase]) {
    const host = hostOf(value);
    if (host) hosts.add(host);
  }

  return [...hosts].flatMap((hostname) =>
    SUPABASE_PATHNAMES.map((pathname) => ({
      protocol: "https" as const,
      hostname,
      pathname,
    }))
  );
}
