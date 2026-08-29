export const publicRoutes: string[] = [
  "/",
  "/about",
  "/studio",
  "/studio/video",
  "/studio/ppt",
  "/studio/assets",
  "/studio/subscription",
  "/studio/profile",
  "/studio/admin",
];

export const authRoutes: string[] = ["/signin", "/signup", "/forgot-password", "/reset-password"];

export const apiAuthPrefix: string = "/api/auth";

// API routes that should be publicly accessible (webhooks, callbacks, public data)
// 注意：这里放行的只是「不需要登录会话」，各路由仍有自己的鉴权——
// callback 校验签名/Bearer，cron 校验 CRON_SECRET，health 本就无敏感数据。
export const publicApiRoutes: string[] = [
  "/api/callback",
  "/api/callback/kie",
  "/api/packages",
  "/api/announcements",
  // 探活须能被外部 uptime 监控直接调用，否则挡在登录后等于没有监控
  "/api/health",
  "/api/cron/grant-daily-credits",
  "/api/cron/reconcile-tasks",
  "/api/gallery/xiaoxiaodong",
];

export const DEFAULT_LOGIN_REDIRECT: string = "/";
