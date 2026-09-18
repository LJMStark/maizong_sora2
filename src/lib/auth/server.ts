import { db } from "@/db";
import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { username } from "better-auth/plugins";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { restrictedUsernames } from "./usernames";
import { sendVerificationEmail, sendResetPasswordEmail } from "@/lib/email";
import { getBetterAuthSocialProviders } from "./social-providers";
import {
  DISPOSABLE_EMAIL_MESSAGE,
  isDisposableEmail,
} from "./disposable-email";

// 环境变量可能被粘贴时带上前后空白（Zeabur 控制台不会 trim 也不会报错）。
// better-auth 的 withPath() 只去尾部斜杠、不去前导空白，于是 baseURL 会变成
// " https://…/api/auth"——这里统一 trim 掉，别把问题留给下游拼接。
const baseURL = (
  process.env.BETTER_AUTH_BASE_URL ||
  process.env.BETTER_AUTH_URL ||
  process.env.NEXT_PUBLIC_BASE_URL ||
  ""
).trim() || undefined;

export const auth = betterAuth({
  baseURL,
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  socialProviders: getBetterAuthSocialProviders(),
  /**
   * 认证端点的限流。默认只有 10 秒 / 100 次这一条全局规则，对登录爆破和批量
   * 注册基本等于没有——而新账号注册即得 50 积分，刷号的收益是真金白银。
   *
   * storage 留在默认的 "memory"：当前是单副本部署，够用。接入 Redis 作
   * `secondaryStorage` 后会自动改用它；若将来手动复制服务做多副本而又没接
   * Redis，阈值会按副本数被静默放大——那时必须改成 "database" 或接 Redis。
   */
  rateLimit: {
    enabled: true,
    window: 60,
    max: 60,
    customRules: {
      // 登录爆破
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-in/username": { window: 60, max: 5 },
      // 批量注册（免费额度农场）
      "/sign-up/email": { window: 3600, max: 5 },
      // 邮件类端点同时也是给别人发垃圾邮件的杠杆
      "/forget-password": { window: 3600, max: 5 },
      "/send-verification-email": { window: 3600, max: 5 },
    },
  },
  advanced: {
    // 站点前置 Cloudflare。不告诉 better-auth 从哪个头取真实 IP 的话，
    // 它看到的是 CF 边缘节点的地址，上面那些按 IP 计数的限流会把所有用户
    // 算成同一个人——一个用户触发限流就把全站登录挡死。
    ipAddress: {
      ipAddressHeaders: ["cf-connecting-ip", "x-forwarded-for"],
    },
  },
  databaseHooks: {
    user: {
      create: {
        /**
         * 一次性邮箱拦截必须放在服务端这一层：注册表单的 zod schema
         * （`signup/validate.ts`）只管浏览器里的即时反馈，
         * 直接 POST `/api/auth/sign-up/email` 就绕过去了。
         */
        before: async (newUser) => {
          if (typeof newUser.email === "string" && isDisposableEmail(newUser.email)) {
            throw new APIError("BAD_REQUEST", {
              message: DISPOSABLE_EMAIL_MESSAGE,
            });
          }
        },
      },
    },
  },
  plugins: [username({
    minUsernameLength: 4,
      maxUsernameLength: 20,
      usernameValidator: (value) => !restrictedUsernames.includes(value),
      usernameNormalization: (value) => value.toLowerCase(),
  })],
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      await sendResetPasswordEmail(user.email, url);
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      await sendVerificationEmail(user.email, url);
    },
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "user",
        required: false,
        input: false,
      },
      gender: {
        type: "boolean",
        required: true,
        input: true,
      },
    },
  },
});
