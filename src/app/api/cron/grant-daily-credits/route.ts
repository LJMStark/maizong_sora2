import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { userSubscription, creditTransaction, user } from "@/db/schema";
import { eq, and, lte, lt, sql, or, isNull } from "drizzle-orm";

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

      await db.transaction(async (tx) => {
        const updateResult = await tx
          .update(user)
          .set({
            credits: sql`${user.credits} + ${subscription.dailyCredits}`,
          })
          .where(eq(user.id, subscription.userId))
          .returning({
            newBalance: user.credits,
          });

        if (updateResult.length === 0) {
          return;
        }

        const newBalance = updateResult[0].newBalance;
        const balanceBefore = newBalance - subscription.dailyCredits;

        await tx.insert(creditTransaction).values({
          id: crypto.randomUUID(),
          userId: subscription.userId,
          type: "addition",
          amount: subscription.dailyCredits,
          balanceBefore,
          balanceAfter: newBalance,
          reason: `会员每日发放 - ${subscription.packageId}`,
          referenceType: "subscription",
          referenceId: subscription.id,
        });

        await tx
          .update(userSubscription)
          .set({ lastGrantDate: today })
          .where(eq(userSubscription.id, subscription.id));
      });

      grantedCount++;
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
    return NextResponse.json(
      { error: "Failed to grant daily credits" },
      { status: 500 }
    );
  }
}
