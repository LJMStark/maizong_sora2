import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * SSRF 防护：
 * - 协议白名单（http/https）
 * - 主机名/IP 字面量的私网检查
 * - DNS 解析后逐个校验解析地址（防域名指向内网）
 * - 受控下载：禁跳转、超时、流式字节上限
 *
 * 说明：DNS 校验与实际 fetch 之间仍存在理论上的重绑定窗口，
 * 但已覆盖直接 IP、私网域名与解析欺骗等主要攻击面。
 */

const PRIVATE_IPV4_RANGES = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
  /^0\./,
  /^169\.254\./,
  /^100\.(6[4-9]|[7-9][0-9]|1[01][0-9]|12[0-7])\./, // CGNAT 100.64.0.0/10
];

function isPrivateIpv4(address: string): boolean {
  return PRIVATE_IPV4_RANGES.some((range) => range.test(address));
}

function isPrivateAddress(address: string): boolean {
  const normalized = address.toLowerCase();

  // IPv4 映射的 IPv6 地址（::ffff:a.b.c.d）按 IPv4 校验
  const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) {
    return isPrivateIpv4(mapped[1]);
  }

  if (isIP(normalized) === 4) {
    return isPrivateIpv4(normalized);
  }

  // IPv6：环回、未指定、ULA（fc00::/7）、链路本地（fe80::/10）
  if (normalized === "::1" || normalized === "::") return true;
  if (/^f[cd]/.test(normalized)) return true;
  if (/^fe[89ab]/.test(normalized)) return true;

  return false;
}

export function validateUrl(urlString: string): URL {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    throw new Error("无效的 URL 格式");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("无效的协议：仅允许 http 和 https");
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, "");

  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    throw new Error("禁止访问 localhost");
  }

  if (isIP(hostname) && isPrivateAddress(hostname)) {
    throw new Error("禁止访问私有网络地址");
  }

  return url;
}

/** DNS 解析并校验所有解析结果均为公网地址 */
export async function assertResolvesToPublicAddress(url: URL): Promise<void> {
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  if (isIP(hostname)) return; // IP 字面量已在 validateUrl 校验

  let addresses;
  try {
    addresses = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new Error("无法解析目标域名");
  }

  if (addresses.length === 0) {
    throw new Error("无法解析目标域名");
  }

  for (const { address } of addresses) {
    if (isPrivateAddress(address)) {
      throw new Error("禁止访问私有网络地址");
    }
  }
}

export interface FetchPublicResourceOptions {
  /** 响应体字节数上限，超出即中止 */
  maxBytes: number;
  /** 整体超时（毫秒），默认 30 秒 */
  timeoutMs?: number;
}

export interface FetchedResource {
  buffer: Buffer;
  contentType: string | null;
}

/**
 * 受控地下载一个外部资源：
 * SSRF 校验 → DNS 校验 → 禁跳转 fetch（带超时）→ 流式读取并限制字节数。
 */
export async function fetchPublicResource(
  urlString: string,
  options: FetchPublicResourceOptions
): Promise<FetchedResource> {
  const { maxBytes, timeoutMs = 30_000 } = options;

  const url = validateUrl(urlString);
  await assertResolvesToPublicAddress(url);

  const response = await fetch(url, {
    redirect: "error",
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!response.ok) {
    throw new Error(`下载外部资源失败: ${response.status}`);
  }

  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    await response.body?.cancel().catch(() => {});
    throw new Error("外部资源超过大小限制");
  }

  if (!response.body) {
    return { buffer: Buffer.alloc(0), contentType: response.headers.get("content-type") };
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > maxBytes) {
      await reader.cancel().catch(() => {});
      throw new Error("外部资源超过大小限制");
    }
    chunks.push(value);
  }

  return {
    buffer: Buffer.concat(chunks),
    contentType: response.headers.get("content-type"),
  };
}
