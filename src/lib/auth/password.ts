import z from "zod/v4";

export const passwordSchema = z
  .string()
  .min(8, {
    message: "密码至少需要 8 个字符",
  })
  .regex(/[A-Z]/, {
    message: "密码至少需要包含一个大写字母",
  })
  .regex(/[a-z]/, {
    message: "密码至少需要包含一个小写字母",
  })
  .regex(/[0-9]/, {
    message: "密码至少需要包含一个数字",
  })
  .regex(/[^A-Za-z0-9]/, {
    message: "密码至少需要包含一个符号",
  });
