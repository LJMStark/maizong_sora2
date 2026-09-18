import { passwordSchema } from "@/lib/auth/password";
import {
  DISPOSABLE_EMAIL_MESSAGE,
  isDisposableEmail,
} from "@/lib/auth/disposable-email";
import { restrictedUsernames } from "@/lib/auth/usernames";
import { z } from "zod";

export const SignUpSchema = z
  .object({
    // 一次性邮箱在这里只是**即时反馈**，真正的拦截在
    // `src/lib/auth/server.ts` 的 databaseHooks——直接 POST 注册端点会绕过本 schema
    email: z
    .email({ message: "邮箱格式不正确" })
    .min(1, { message: "请输入邮箱" })
    .refine((email) => !isDisposableEmail(email), {
      message: DISPOSABLE_EMAIL_MESSAGE,
    }),
    name: z.string().min(4, { message: "至少需要 4 个字符" }),
    username: z
    .string()
    .min(4, { message: "至少需要 4 个字符" })
    .max(20, { message: "最多 20 个字符" })
    .regex(/^[a-zA-Z0-9]+$/, "只允许字母和数字")
    .refine(
      (username) => {
        for (const pattern of restrictedUsernames) {
          if (username.toLowerCase().includes(pattern)) {
            return false;
          }
        }
        return true;
      },
      { message: "用户名包含不允许的词汇" }
    ),
    password: passwordSchema,
    confirmPassword: z.string().min(8, {
      message: "至少需要 8 个字符",
    }),
    gender: z.boolean().nonoptional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "两次输入的密码不一致",
    path: ["confirmPassword"],
  });

export type SignUpValues = z.infer<typeof SignUpSchema>;
