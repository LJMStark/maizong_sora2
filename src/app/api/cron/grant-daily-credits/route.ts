import { NextRequest, NextResponse } from "next/server";
import { and, eq, gte, isNull, lt, lte, or } from "drizzle-orm";
import { db } from "@/db";
import { userSubscription } from "@/db/schema";
import { sanitizeApiErrorMessage } from "@/lib/api/sanitize-error-message";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date().toISOString().slice(0, 10);

  try {
    const expiredRows = await db
      .update(userSubscription)
      .set({ status: "expired" })
      .where(
        and(
          eq(userSubscription.status, "active"),
          lt(userSubscription.endDate, today)
        )
      )
      .returning({ id: userSubscription.id });

    // 新模型下每日额度不再写入 user.credits，而是刷新 daily_credits_remaining。
    const refreshedRows = await db
      .update(userSubscription)
      .set({
        dailyCreditsRemaining: userSubscription.dailyCredits,
        lastGrantDate: today,
      })
      .where(
        and(
          eq(userSubscription.status, "active"),
          lte(userSubscription.startDate, today),
          gte(userSubscription.endDate, today),
          or(
            isNull(userSubscription.lastGrantDate),
            lt(userSubscription.lastGrantDate, today)
          )
        )
      )
      .returning({ id: userSubscription.id });

    return NextResponse.json({
      success: true,
      refreshedDailyQuota: refreshedRows.length,
      expiredSubscriptions: expiredRows.length,
      date: today,
    });
  } catch (error) {
    const message = sanitizeApiErrorMessage(error);
    return NextResponse.json(
      { error: `刷新订阅额度失败：${message}` },
      { status: 500 }
    );
  }
}
