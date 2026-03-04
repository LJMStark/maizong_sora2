import { createAuthClient } from "better-auth/react";
import { usernameClient } from "better-auth/client/plugins";
import { nextCookies } from "better-auth/next-js";
const baseURL =
  typeof window !== "undefined"
    ? window.location.origin
    : process.env.NEXT_PUBLIC_BASE_URL;

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
  requestPasswordReset,
  resetPassword,
  sendVerificationEmail,
} =
  createAuthClient({
    baseURL,
    emailAndPassword: {
      enabled: true,
    },
    plugins: [usernameClient(), nextCookies()],
  });
