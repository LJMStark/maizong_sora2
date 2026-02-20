export function sanitizeApiErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  const sanitized = raw
    .replace(/(Bearer\s+)[^\s]+/gi, "$1[已隐藏]")
    .replace(
      /(api[_-]?key|token|secret)\s*[:=]\s*[^\s,;]+/gi,
      "$1=[已隐藏]"
    )
    .trim();

  return sanitized || "未知错误";
}
