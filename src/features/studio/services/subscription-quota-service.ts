import { and, eq, gte, isNull, lt, lte, or } from "drizzle-orm";
import { db } from "@/db";
import { userSubscription } from "@/db/schema";

export interface SubscriptionQuotaRefreshResult {
  refreshedDailyQuota: number;
  expiredSubscriptions: number;
  date: string;
}

/**
 * 订阅每日额度刷新 + 过期处理。
 *
 * 注意：额度在用户访问钱包时也会由 credit-service 惰性刷新，所以这里
 * 主要是兜底——保证长期不活跃的订阅也能被正确置为 expired，不至于
 * 一直挂在 active 状态。幂等，可重复执行。
 */
export async function refreshDailySubscriptionQuota(): Promise<SubscriptionQuotaRefreshResult> {
  const today = new Date().toISOString().slice(0, 10);

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

  return {
    refreshedDailyQuota: refreshedRows.length,
    expiredSubscriptions: expiredRows.length,
    date: today,
  };
}
