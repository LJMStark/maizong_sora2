export const publicRoutes: string[] = [
  "/",
  "/about",
  // 法务页必须匿名可达：注册页在用户还没有会话时就链向它们，
  // 且 DMCA 安全港与 TAKE IT DOWN 的通报流程要求「clear and conspicuous」公示
  "/terms",
  "/privacy",
  "/takedown",
  // 「先玩再注册」的体验面 + 定价页，匿名可看
  "/studio",
  "/studio/video",
  "/studio/ppt",
  "/studio/subscription",
];

/**
 * 匿名访问时重定向到登录页的**页面**前缀。
 *
 * 为什么要显式列出，而不是沿用「不在 publicRoutes 里就重定向」：
 * 那样写会把**所有不存在的路径**也一并 307 到 /signin，于是站点永远不返回
 * 404——爬虫拿到的是 soft 404，用户点到过期链接看到的是莫名的登录页，
 * `not-found.tsx` 也永远不会被渲染。
 *
 * 页面级门禁在本项目里本来就只是体验层：数据一律由 API 取，而每个 API 都自己
 * 校验会话（见下方 publicApiRoutes 的说明）。真正的安全边界在 API 那一层，
 * 它仍然是「默认拒绝」。
 */
export const authGatedRoutePrefixes: string[] = [
  "/studio/admin",
  "/studio/assets",
  "/studio/profile",
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
