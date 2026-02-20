export const publicRoutes: string[] = [
  "/",
  "/about",
  "/studio",
  "/studio/video",
  "/studio/assets",
  "/studio/subscription",
  "/studio/profile",
];

export const authRoutes: string[] = ["/signin", "/signup", "/forgot-password", "/reset-password"];

export const apiAuthPrefix: string = "/api/auth";

// API routes that should be publicly accessible (webhooks, callbacks, public data)
export const publicApiRoutes: string[] = [
  "/api/callback",
  "/api/callback/kie",
  "/api/packages",
  "/api/announcements",
  "/api/cron/grant-daily-credits",
];

export const DEFAULT_LOGIN_REDIRECT: string = "/";
