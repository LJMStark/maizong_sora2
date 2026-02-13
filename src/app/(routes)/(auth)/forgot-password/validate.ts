import { z } from "zod";

export const ForgotPasswordSchema = z.object({
  email: z.string().email({ message: "邮箱格式不正确" }),
});

export type ForgotPasswordValues = z.infer<typeof ForgotPasswordSchema>;
