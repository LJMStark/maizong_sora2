import { isUserFacingError } from "@/lib/security/user-facing-error";

/** 拼进「xxx失败：${message}」句式的通用兜底，比整句版本短。 */
const GENERIC_DETAIL = "上游服务异常";

/**
 * 与 `sanitizeError` 同一层保证（白名单放行，其余替换），
 * 区别只是返回的是**短语**而不是整句——调用方会拼成
 * `润色提示词失败：${message}` 这类句子。
 */
export function sanitizeApiErrorMessage(error: unknown): string {
  if (isUserFacingError(error)) {
    const message = error.message.trim();
    if (message) return message;
  }

  console.error("[Sanitized Error]:", error);
  return GENERIC_DETAIL;
}
