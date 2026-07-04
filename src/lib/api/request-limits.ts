import { NextResponse, type NextRequest } from "next/server";

/**
 * Rejects a request whose declared body size exceeds `maxBytes` before the body
 * is parsed into memory. Guards `request.json()` / `Buffer.from()` upload paths
 * against out-of-memory payloads. Returns a 413 response when over the limit,
 * or null to continue. A missing/invalid Content-Length is allowed through so
 * schema validation (with its own size cap) remains the final gate.
 */
export function enforceMaxBodySize(
  request: NextRequest,
  maxBytes: number
): NextResponse | null {
  const header = request.headers.get("content-length");
  if (!header) return null;

  const declared = Number.parseInt(header, 10);
  if (!Number.isFinite(declared)) return null;

  if (declared > maxBytes) {
    return NextResponse.json({ error: "请求体过大" }, { status: 413 });
  }

  return null;
}
