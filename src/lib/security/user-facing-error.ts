/**
 * 允许把 message 原样返回给最终用户的错误基类。
 *
 * 脱敏出口（`sanitizeError` / `sanitizeApiErrorMessage`）采用**白名单**策略：
 * 只有继承本类的错误才放行自己的文案，其余一律替换成通用文案。原因是关键词
 * 黑名单挡不住真实的上游错误——Google SDK 抛的 message 里带着
 * `generativelanguage.googleapis.com` 和具体模型名，Postgres 驱动抛的带着
 * 内网 IP 和端口，这些都不含 key/token/secret 字样却同样不该外泄。
 *
 * 另见 `~/.claude/rules/ecc/common/ai-provider-fallback.md`：具体用哪家模型、
 * 哪个供应商属内部信息，不得出现在客户可见渠道——API 错误响应就是客户可见渠道。
 *
 * 继承本类时，构造函数里的文案必须是我们自己写的固定句子，
 * **不要**把 `upstreamError.message` 拼进去。需要保留细节给日志时，
 * 把细节放 `cause`，`console.error` 会打出来。
 */
export class UserFacingError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "UserFacingError";
  }
}

export function isUserFacingError(error: unknown): error is UserFacingError {
  return error instanceof UserFacingError;
}
