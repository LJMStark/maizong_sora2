import { db } from "@/db";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";

type ActiveUserCheckResult =
  | { ok: true }
  | { ok: false; status: 403 | 404; error: string };

export async function ensureUserActive(
  userId: string
): Promise<ActiveUserCheckResult> {
  const rows = await db
    .select({ role: user.role })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (rows.length === 0) {
    return { ok: false, status: 404, error: "用户不存在" };
  }

  if (rows[0].role === "disabled") {
    return { ok: false, status: 403, error: "账户已被禁用" };
  }

  return { ok: true };
}
