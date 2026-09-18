import { isUserFacingError } from "./user-facing-error";

/** 非白名单错误统一用这句对外，细节只进日志。 */
export const GENERIC_ERROR_MESSAGE = "服务暂时不可用，请稍后重试";

/**
 * 把错误转成可以安全返回给用户的文案。
 *
 * 白名单策略：只有 `UserFacingError` 及其子类放行自己的 message，其余替换。
 * 早先这里是关键词黑名单（命中 key/token/secret/env 才替换），挡不住
 * 上游 SDK 的原始错误——那些 message 里有供应商域名、模型名、内网地址。
 */
export function sanitizeError(error: unknown): string {
  // 完整错误只进服务端日志
  console.error("[Internal Error]:", error);

  if (isUserFacingError(error)) {
    const message = error.message.trim();
    if (message) return message;
  }

  return GENERIC_ERROR_MESSAGE;
}
