import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
import { db } from "@/db";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";

type AdminCheckResult =
  | { userId: string }
  | { error: string; status: number };

export async function checkAdmin(): Promise<AdminCheckResult> {
  const session = await getServerSession();

  if (!session?.user?.id) {
    return { error: "未授权", status: 401 };
  }

  const userResult = await db
    .select({ role: user.role })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);

  if (userResult.length === 0 || userResult[0].role !== "admin") {
    return { error: "需要管理员权限", status: 403 };
  }

  return { userId: session.user.id };
}

export function isAdminError(
  result: AdminCheckResult
): result is { error: string; status: number } {
  return "error" in result;
}

export function adminErrorResponse(result: { error: string; status: number }) {
  return NextResponse.json({ error: result.error }, { status: result.status });
}
