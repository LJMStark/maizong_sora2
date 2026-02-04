
/**
 * Validates a URL to prevent SSRF attacks.
 * Checks for:
 * - Valid protocol (http/https)
 * - non-localhost/private IP hostnames (basic string check)
 * 
 * Note: For complete protection, DNS resolution should be verified, 
 * but this catches basic errors and direct IP usage.
 */

const PRIVATE_IP_RANGES = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
  /^0\./,
  /^169\.254\./,
  /^::1$/,
  /^[fF][cCdD]/, // IPv6 ULA
];

export function validateUrl(urlString: string): void {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    throw new Error("无效的 URL 格式");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("无效的协议：仅允许 http 和 https");
  }

  const hostname = url.hostname;

  if (hostname === "localhost") {
    throw new Error("禁止访问 localhost");
  }

  // Check for private IPs
  for (const range of PRIVATE_IP_RANGES) {
    if (range.test(hostname)) {
      throw new Error("禁止访问私有网络地址");
    }
  }
}
