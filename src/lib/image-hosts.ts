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
 *
 * Supabase 主机放行存储的签名/公开两种路径。灵感库若托管在独立 CDN
 * （例如 Cloudflare R2 自定义域名），它的路径不是 `/storage/v1/...`，
 * 所以按灵感库地址本身的路径前缀放行。同一主机只保留一组规则。
 */
export function buildRemoteImagePatterns(env: {
  supabaseUrl?: string;
  galleryBase?: string;
}): RemoteImagePattern[] {
  const patterns: RemoteImagePattern[] = [];
  const seen = new Set<string>();
  const add = (hostname: string, pathname: string) => {
    const key = `${hostname}${pathname}`;
    if (seen.has(key)) return;
    seen.add(key);
    patterns.push({ protocol: "https", hostname, pathname });
  };

  const supabaseHost = hostOf(env.supabaseUrl);
  if (supabaseHost) {
    for (const pathname of SUPABASE_PATHNAMES) add(supabaseHost, pathname);
  }

  const galleryHost = hostOf(env.galleryBase);
  if (galleryHost && galleryHost !== supabaseHost) {
    const prefix = new URL(env.galleryBase!.trim()).pathname.replace(/\/+$/, "");
    add(galleryHost, `${prefix}/**`);
  }

  return patterns;
}
