import { z } from "zod";

export const SignInSchema = z.object({
  username: z.string().min(1, { message: "请输入用户名或邮箱" }).max(100, { message: "输入内容过长" }),
  password: z
    .string()
    .min(6, { message: "密码至少需要 6 个字符" }),
});

export type SignInValues = z.infer<typeof SignInSchema>;
