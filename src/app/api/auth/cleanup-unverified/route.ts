import { db } from "@/db";
import { user } from "@/db/schema/auth/user";
import { account } from "@/db/schema/auth/account";
import { session } from "@/db/schema/auth/session";
import { verification } from "@/db/schema/auth/verification";
import { eq, and, or, inArray, lt } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { rateLimiter } from "@/lib/rate-limit";
import { sanitizeApiErrorMessage } from "@/lib/api/sanitize-error-message";

function getClientIdentifier(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip");
  return ip || "unknown";
}

// A fresh unverified signup must never be deletable by a third party (it would
// let anyone block a victim's pending verification), so only accounts older
// than this are eligible — by then the verification link has long expired and
// the owner can simply re-register.
const MIN_UNVERIFIED_AGE_MS = 24 * 60 * 60 * 1000;

// Called (unauthenticated) by the signup form to clear a stale, still-unverified
// account before re-registering the same email. It only ever touches accounts
// with emailVerified=false that are older than MIN_UNVERIFIED_AGE_MS, never
// verified users. To avoid abuse it is IP rate-limited and returns a constant
// response so it cannot be used to enumerate which emails have a pending account.
export async function POST(request: NextRequest) {
  const { success } = await rateLimiter.limit(
    getClientIdentifier(request),
    "redeem"
  );
  if (!success) {
    return NextResponse.json(
      { error: "请求过于频繁，请稍后重试" },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { email, username } = body;

    if (
      (email !== undefined && typeof email !== "string") ||
      (username !== undefined && typeof username !== "string")
    ) {
      return NextResponse.json({ error: "参数格式错误" }, { status: 400 });
    }

    if (!email && !username) {
      return NextResponse.json(
        { error: "必须提供邮箱或用户名" },
        { status: 400 }
      );
    }

    const conditions = [];
    if (email) conditions.push(eq(user.email, email));
    if (username) conditions.push(eq(user.username, username));

    const staleCutoff = new Date(Date.now() - MIN_UNVERIFIED_AGE_MS);
    const unverifiedUsers = await db
      .select({ id: user.id })
      .from(user)
      .where(
        and(
          or(...conditions),
          eq(user.emailVerified, false),
          lt(user.createdAt, staleCutoff)
        )
      );

    if (unverifiedUsers.length > 0) {
      const ids = unverifiedUsers.map((u) => u.id);

      await db.delete(session).where(inArray(session.userId, ids));
      await db.delete(account).where(inArray(account.userId, ids));
      await db.delete(verification).where(eq(verification.identifier, email));
      await db.delete(user).where(inArray(user.id, ids));
    }

    // Constant response: never disclose how many (if any) accounts matched.
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[cleanup-unverified] 清理未验证用户失败:", error);
    return NextResponse.json(
      { error: `清理未验证用户失败：${sanitizeApiErrorMessage(error)}` },
      { status: 500 }
    );
  }
}
