export const publicRoutes: string[] = [
  "/",
  "/about",
  "/studio",
  "/studio/video",
  "/studio/assets",
  "/studio/subscription",
];

export const authRoutes: string[] = ["/signin", "/signup", "/forgot-password"];

export const apiAuthPrefix: string = "/api/auth";

// API routes that should be publicly accessible (webhooks, callbacks, public data)
export const publicApiRoutes: string[] = ["/api/callback", "/api/packages"];

export const DEFAULT_LOGIN_REDIRECT: string = "/";
