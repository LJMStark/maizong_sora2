import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

import {
  apiAuthPrefix,
  authGatedRoutePrefixes,
  authRoutes,
  publicRoutes,
  publicApiRoutes,
} from "./routes";

export async function proxy(request: NextRequest) {
  const session = getSessionCookie(request);
  const pathname = request.nextUrl.pathname;

  const isApiAuth = pathname.startsWith(apiAuthPrefix);
  const isPublicRoute = publicRoutes.includes(pathname);
  const isPublicApiRoute = publicApiRoutes.some((route) => pathname.startsWith(route));

  const isAuthRoute = () => {
    return authRoutes.some((path) => pathname.startsWith(path));
  };

  // Allow Better Auth API routes
  if (isApiAuth) {
    return NextResponse.next();
  }

  // Allow public API routes (webhooks, callbacks)
  if (isPublicApiRoute) {
    return NextResponse.next();
  }

  if (isAuthRoute()) {
    return NextResponse.next();
  }

  // API 仍是「默认拒绝」：不在 publicApiRoutes 里且无会话，一律 401。
  // 这才是真正的安全边界，页面门禁只负责体验。
  if (pathname.startsWith("/api/")) {
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // 页面：只有显式列出的登录后页面才把匿名用户送去登录页。
  // 其余未知路径交给 Next 渲染真正的 404（见 routes.ts 里的说明）。
  if (!session && !isPublicRoute) {
    const needsLogin = authGatedRoutePrefixes.some((prefix) =>
      pathname === prefix || pathname.startsWith(`${prefix}/`)
    );
    if (needsLogin) {
      const signInUrl = new URL("/signin", request.url);
      // 带上来路，登录后能回到原本想去的页面
      signInUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(signInUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * 匹配除下列之外的全部路径：
     * - _next/static、_next/image：构建产物与图片优化
     * - favicon.ico
     * - robots.txt / sitemap.xml：爬虫是匿名请求，若走进 proxy 会被 307 到
     *   /signin，等于这两个文件生成了也拿不到（它们由 src/app/robots.ts 与
     *   src/app/sitemap.ts 生成，不在 publicRoutes 里）
     * - opengraph-image / twitter-image：社交平台抓卡片同样是匿名请求
     * - 常见静态资源后缀（含 .txt / .xml，兜住上面两个文件的任何命名变化）
     */
    "/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|opengraph-image|twitter-image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|txt|xml|webmanifest)$).*)",
  ],
};
