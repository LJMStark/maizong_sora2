import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { userSubscription, creditTransaction, user } from "@/db/schema";
import { eq, and, lte, lt, gte, sql, or, isNull } from "drizzle-orm";
import { sanitizeApiErrorMessage } from "@/lib/api/sanitize-error-message";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date().toISOString().split("T")[0];

  try {
    const activeSubscriptions = await db
      .select()
      .from(userSubscription)
      .where(
        and(
          eq(userSubscription.status, "active"),
          lte(userSubscription.startDate, today),
          or(
            isNull(userSubscription.lastGrantDate),
            lt(userSubscription.lastGrantDate, today)
          )
        )
      );

    let grantedCount = 0;
    let expiredCount = 0;

    for (const subscription of activeSubscriptions) {
      if (subscription.endDate < today) {
        await db
          .update(userSubscription)
          .set({ status: "expired" })
          .where(eq(userSubscription.id, subscription.id));
        expiredCount++;
        continue;
      }

      const granted = await db.transaction(async (tx) => {
        // 先以条件更新“抢占”当日发放资格，避免并发重复发放
        const claimed = await tx
          .update(userSubscription)
          .set({ lastGrantDate: today })
          .where(
            and(
              eq(userSubscription.id, subscription.id),
              eq(userSubscription.status, "active"),
              lte(userSubscription.startDate, today),
              gte(userSubscription.endDate, today),
              or(
                isNull(userSubscription.lastGrantDate),
                lt(userSubscription.lastGrantDate, today)
              )
            )
          )
          .returning({
            id: userSubscription.id,
            userId: userSubscription.userId,
            packageId: userSubscription.packageId,
            dailyCredits: userSubscription.dailyCredits,
          });

        if (claimed.length === 0) {
          return false;
        }

        const current = claimed[0];
        const updateResult = await tx
          .update(user)
          .set({
            credits: sql`${user.credits} + ${current.dailyCredits}`,
          })
          .where(eq(user.id, current.userId))
          .returning({
            newBalance: user.credits,
          });

        if (updateResult.length === 0) {
          throw new Error(`订阅用户不存在: ${current.userId}`);
        }

        const newBalance = updateResult[0].newBalance;
        const balanceBefore = newBalance - current.dailyCredits;

        await tx.insert(creditTransaction).values({
          id: crypto.randomUUID(),
          userId: current.userId,
          type: "addition",
          amount: current.dailyCredits,
          balanceBefore,
          balanceAfter: newBalance,
          reason: `会员每日发放 - ${current.packageId}`,
          referenceType: "subscription",
          referenceId: current.id,
        });

        return true;
      });

      if (granted) {
        grantedCount++;
      }
    }

    console.log(
      `[Cron] Daily credits granted: ${grantedCount}, expired: ${expiredCount}`
    );

    return NextResponse.json({
      success: true,
      granted: grantedCount,
      expired: expiredCount,
      date: today,
    });
  } catch (error) {
    console.error("[Cron] Error granting daily credits:", error);
    const message = sanitizeApiErrorMessage(error);
    return NextResponse.json(
      { error: `发放每日积分失败：${message}` },
      { status: 500 }
    );
  }
}
