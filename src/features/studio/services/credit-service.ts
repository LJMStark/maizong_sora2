import { db } from "@/db";
import { creditTransaction, user, userSubscription } from "@/db/schema";
import { and, desc, eq, gte, lt, lte, sql } from "drizzle-orm";

export type CreditOperationType = "deduction" | "addition" | "refund";

export interface DeductCreditsParams {
  userId: string;
  amount: number;
  reason: string;
  referenceType?: string;
  referenceId?: string;
}

export interface RefundCreditsParams {
  userId: string;
  amount: number;
  reason: string;
  referenceType?: string;
  referenceId?: string;
  sourceTransactionId?: string;
}

interface DeductionBreakdown {
  purchased: number;
  subscriptions: Array<{
    subscriptionId: string;
    daily: number;
    monthly: number;
  }>;
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type UserSubscriptionRow = typeof userSubscription.$inferSelect;

const THIRTY_DAYS_IN_MS = 30 * 24 * 60 * 60 * 1000;

function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseDateOnly(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function calculateMonthlyCycleIndex(startDate: string, today: string): number {
  const start = parseDateOnly(startDate).getTime();
  const current = parseDateOnly(today).getTime();

  if (current <= start) {
    return 0;
  }

  return Math.floor((current - start) / THIRTY_DAYS_IN_MS);
}

function toSafeCredits(value: number | null | undefined): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 0;
  }
  return Math.max(0, Math.floor(value));
}

function getSubscriptionAvailableCredits(subscription: UserSubscriptionRow | null): number {
  if (!subscription) {
    return 0;
  }
  return (
    toSafeCredits(subscription.dailyCreditsRemaining) +
    toSafeCredits(subscription.monthlyCreditsRemaining)
  );
}

function getTotalAvailableCredits(params: {
  purchasedCredits: number;
  subscriptions: UserSubscriptionRow[];
}): number {
  const subscriptionCredits = params.subscriptions.reduce(
    (sum, subscription) => sum + getSubscriptionAvailableCredits(subscription),
    0
  );
  return toSafeCredits(params.purchasedCredits) + subscriptionCredits;
}

function parseDeductionBreakdown(
  metadata: Record<string, unknown> | null | undefined
): DeductionBreakdown | null {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  const raw = metadata.deductionBreakdown;
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const source = raw as Record<string, unknown>;
  if (Array.isArray(source.subscriptions)) {
    const purchased = typeof source.purchased === "number" ? source.purchased : NaN;
    if (Number.isNaN(purchased) || purchased < 0) {
      return null;
    }

    const parsedSubscriptions: DeductionBreakdown["subscriptions"] = [];
    for (const item of source.subscriptions) {
      if (!item || typeof item !== "object") {
        return null;
      }
      const allocation = item as Record<string, unknown>;
      const subscriptionId =
        typeof allocation.subscriptionId === "string"
          ? allocation.subscriptionId
          : null;
      const daily = typeof allocation.daily === "number" ? allocation.daily : NaN;
      const monthly = typeof allocation.monthly === "number" ? allocation.monthly : NaN;

      if (!subscriptionId || Number.isNaN(daily) || Number.isNaN(monthly) || daily < 0 || monthly < 0) {
        return null;
      }

      parsedSubscriptions.push({
        subscriptionId,
        daily: Math.floor(daily),
        monthly: Math.floor(monthly),
      });
    }

    return {
      purchased: Math.floor(purchased),
      subscriptions: parsedSubscriptions,
    };
  }

  // 兼容旧格式：{ daily, monthly, purchased, subscriptionId }
  const daily = typeof source.daily === "number" ? source.daily : NaN;
  const monthly = typeof source.monthly === "number" ? source.monthly : NaN;
  const purchased = typeof source.purchased === "number" ? source.purchased : NaN;
  const subscriptionId =
    typeof source.subscriptionId === "string" ? source.subscriptionId : null;
  if ([daily, monthly, purchased].some((v) => Number.isNaN(v) || v < 0)) {
    return null;
  }

  return {
    purchased: Math.floor(purchased),
    subscriptions: subscriptionId
      ? [
          {
            subscriptionId,
            daily: Math.floor(daily),
            monthly: Math.floor(monthly),
          },
        ]
      : [],
  };
}

function ensureNonNegativeInteger(amount: number): void {
  if (!Number.isInteger(amount) || amount < 0) {
    throw new Error("积分数量必须是非负整数");
  }
}

async function lockUserWallet(tx: Tx, userId: string): Promise<void> {
  const lockKey = `credit_wallet:${userId}`;
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${lockKey}))`);
}

async function expireOutdatedSubscriptions(
  tx: Tx,
  userId: string,
  today: string
): Promise<void> {
  await tx
    .update(userSubscription)
    .set({ status: "expired" })
    .where(
      and(
        eq(userSubscription.userId, userId),
        eq(userSubscription.status, "active"),
        lt(userSubscription.endDate, today)
      )
    );
}

async function getActiveSubscriptions(
  tx: Tx,
  userId: string,
  today: string
): Promise<UserSubscriptionRow[]> {
  return tx
    .select()
    .from(userSubscription)
    .where(
      and(
        eq(userSubscription.userId, userId),
        eq(userSubscription.status, "active"),
        lte(userSubscription.startDate, today),
        gte(userSubscription.endDate, today)
      )
    )
    .orderBy(userSubscription.endDate, desc(userSubscription.createdAt));
}

async function syncSubscriptionQuotaIfNeeded(
  tx: Tx,
  subscription: UserSubscriptionRow,
  today: string
): Promise<UserSubscriptionRow> {
  let current = subscription;
  const updatePayload: Partial<typeof userSubscription.$inferInsert> = {};

  const currentCycleIndex = calculateMonthlyCycleIndex(subscription.startDate, today);
  if (currentCycleIndex > subscription.monthlyCycleIndex) {
    updatePayload.monthlyCycleIndex = currentCycleIndex;
    updatePayload.monthlyCreditsRemaining = toSafeCredits(subscription.monthlyCredits);
  }

  if (!subscription.lastGrantDate || subscription.lastGrantDate < today) {
    updatePayload.lastGrantDate = today;
    updatePayload.dailyCreditsRemaining = toSafeCredits(subscription.dailyCredits);
  }

  if (Object.keys(updatePayload).length === 0) {
    return current;
  }

  const updatedRows = await tx
    .update(userSubscription)
    .set(updatePayload)
    .where(eq(userSubscription.id, subscription.id))
    .returning();

  if (updatedRows[0]) {
    current = updatedRows[0];
  }

  return current;
}

async function getWalletState(tx: Tx, userId: string, today: string): Promise<{
  purchasedCredits: number;
  activeSubscriptions: UserSubscriptionRow[];
}> {
  const userRows = await tx
    .select({ credits: user.credits })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (userRows.length === 0) {
    throw new Error("用户不存在");
  }

  await expireOutdatedSubscriptions(tx, userId, today);

  const activeSubscriptions = await getActiveSubscriptions(tx, userId, today);
  const syncedSubscriptions: UserSubscriptionRow[] = [];
  for (const subscription of activeSubscriptions) {
    const synced = await syncSubscriptionQuotaIfNeeded(tx, subscription, today);
    syncedSubscriptions.push(synced);
  }

  return {
    purchasedCredits: toSafeCredits(userRows[0].credits),
    activeSubscriptions: syncedSubscriptions,
  };
}

export const creditService = {
  async getUserCredits(userId: string): Promise<number> {
    const today = formatDateOnly(new Date());

    return db.transaction(async (tx) => {
      await lockUserWallet(tx, userId);
      const state = await getWalletState(tx, userId, today);
      return getTotalAvailableCredits({
        purchasedCredits: state.purchasedCredits,
        subscriptions: state.activeSubscriptions,
      });
    });
  },

  async deductCredits(params: DeductCreditsParams): Promise<{
    transactionId: string;
    newBalance: number;
  }> {
    const { userId, amount, reason, referenceType, referenceId } = params;
    ensureNonNegativeInteger(amount);

    const transactionId = crypto.randomUUID();
    const today = formatDateOnly(new Date());

    return db.transaction(async (tx) => {
      await lockUserWallet(tx, userId);
      const state = await getWalletState(tx, userId, today);

      const totalBefore = getTotalAvailableCredits({
        purchasedCredits: state.purchasedCredits,
        subscriptions: state.activeSubscriptions,
      });

      if (totalBefore < amount) {
        throw new Error("积分不足");
      }

      let remaining = amount;
      const subscriptionUsages: DeductionBreakdown["subscriptions"] = [];

      for (const subscription of state.activeSubscriptions) {
        if (remaining <= 0) {
          break;
        }

        const dailyAvailable = toSafeCredits(subscription.dailyCreditsRemaining);
        const monthlyAvailable = toSafeCredits(subscription.monthlyCreditsRemaining);
        const dailyUsed = Math.min(remaining, dailyAvailable);
        remaining -= dailyUsed;
        const monthlyUsed = Math.min(remaining, monthlyAvailable);
        remaining -= monthlyUsed;

        if (dailyUsed > 0 || monthlyUsed > 0) {
          await tx
            .update(userSubscription)
            .set({
              dailyCreditsRemaining: dailyAvailable - dailyUsed,
              monthlyCreditsRemaining: monthlyAvailable - monthlyUsed,
            })
            .where(eq(userSubscription.id, subscription.id));

          subscriptionUsages.push({
            subscriptionId: subscription.id,
            daily: dailyUsed,
            monthly: monthlyUsed,
          });
        }
      }

      const purchasedUsed = remaining;

      if (purchasedUsed > 0) {
        await tx
          .update(user)
          .set({
            credits: sql`${user.credits} - ${purchasedUsed}`,
          })
          .where(eq(user.id, userId));
      }

      const totalAfter = totalBefore - amount;
      const breakdown: DeductionBreakdown = {
        purchased: purchasedUsed,
        subscriptions: subscriptionUsages,
      };

      await tx.insert(creditTransaction).values({
        id: transactionId,
        userId,
        type: "deduction",
        amount,
        balanceBefore: totalBefore,
        balanceAfter: totalAfter,
        reason,
        referenceType,
        referenceId,
        metadata: {
          deductionBreakdown: breakdown,
        },
      });

      return {
        transactionId,
        newBalance: totalAfter,
      };
    });
  },

  async refundCredits(params: RefundCreditsParams): Promise<{
    transactionId: string;
    newBalance: number;
  }> {
    const { userId, amount, reason, referenceType, referenceId } = params;
    ensureNonNegativeInteger(amount);

    const sourceTransactionId =
      params.sourceTransactionId ??
      (referenceType === "credit_transaction" ? referenceId : undefined);

    const transactionId = crypto.randomUUID();
    const today = formatDateOnly(new Date());

    return db.transaction(async (tx) => {
      await lockUserWallet(tx, userId);
      const state = await getWalletState(tx, userId, today);

      const totalBefore = getTotalAvailableCredits({
        purchasedCredits: state.purchasedCredits,
        subscriptions: state.activeSubscriptions,
      });

      const activeSubscriptions = new Map(
        state.activeSubscriptions.map((subscription) => [subscription.id, subscription])
      );

      const subscriptionRefunds: DeductionBreakdown["subscriptions"] = [];
      let refundedToSubscriptions = 0;

      if (sourceTransactionId) {
        const sourceRows = await tx
          .select({
            metadata: creditTransaction.metadata,
          })
          .from(creditTransaction)
          .where(
            and(
              eq(creditTransaction.id, sourceTransactionId),
              eq(creditTransaction.userId, userId),
              eq(creditTransaction.type, "deduction")
            )
          )
          .limit(1);

        const source = sourceRows[0];
        const parsedBreakdown = parseDeductionBreakdown(
          source?.metadata as Record<string, unknown> | null | undefined
        );

        if (parsedBreakdown) {
          const parsedTotal =
            parsedBreakdown.purchased +
            parsedBreakdown.subscriptions.reduce(
              (sum, allocation) => sum + allocation.daily + allocation.monthly,
              0
            );

          if (parsedTotal === amount) {
            for (const allocation of parsedBreakdown.subscriptions) {
              const activeSubscription = activeSubscriptions.get(
                allocation.subscriptionId
              );
              if (!activeSubscription) {
                continue;
              }

              const dailyRemaining = toSafeCredits(
                activeSubscription.dailyCreditsRemaining
              );
              const monthlyRemaining = toSafeCredits(
                activeSubscription.monthlyCreditsRemaining
              );
              const dailyCapacity = Math.max(
                0,
                toSafeCredits(activeSubscription.dailyCredits) - dailyRemaining
              );
              const monthlyCapacity = Math.max(
                0,
                toSafeCredits(activeSubscription.monthlyCredits) - monthlyRemaining
              );

              const dailyRefund = Math.min(allocation.daily, dailyCapacity);
              const monthlyRefund = Math.min(allocation.monthly, monthlyCapacity);

              if (dailyRefund > 0 || monthlyRefund > 0) {
                await tx
                  .update(userSubscription)
                  .set({
                    dailyCreditsRemaining: dailyRemaining + dailyRefund,
                    monthlyCreditsRemaining: monthlyRemaining + monthlyRefund,
                  })
                  .where(eq(userSubscription.id, activeSubscription.id));

                activeSubscriptions.set(activeSubscription.id, {
                  ...activeSubscription,
                  dailyCreditsRemaining: dailyRemaining + dailyRefund,
                  monthlyCreditsRemaining: monthlyRemaining + monthlyRefund,
                });

                subscriptionRefunds.push({
                  subscriptionId: activeSubscription.id,
                  daily: dailyRefund,
                  monthly: monthlyRefund,
                });
                refundedToSubscriptions += dailyRefund + monthlyRefund;
              }
            }
          }
        }
      }

      const purchasedRefund = amount - refundedToSubscriptions;

      if (purchasedRefund > 0) {
        await tx
          .update(user)
          .set({
            credits: sql`${user.credits} + ${purchasedRefund}`,
          })
          .where(eq(user.id, userId));
      }

      const totalAfter = totalBefore + amount;

      await tx.insert(creditTransaction).values({
        id: transactionId,
        userId,
        type: "refund",
        amount,
        balanceBefore: totalBefore,
        balanceAfter: totalAfter,
        reason,
        referenceType,
        referenceId,
        metadata: {
          sourceTransactionId: sourceTransactionId ?? null,
          refundBreakdown: {
            purchased: purchasedRefund,
            subscriptions: subscriptionRefunds,
          },
        },
      });

      return {
        transactionId,
        newBalance: totalAfter,
      };
    });
  },

  async addCredits(params: {
    userId: string;
    amount: number;
    reason: string;
    referenceType?: string;
    referenceId?: string;
  }): Promise<{ transactionId: string; newBalance: number }> {
    const { userId, amount, reason, referenceType, referenceId } = params;
    ensureNonNegativeInteger(amount);

    const transactionId = crypto.randomUUID();
    const today = formatDateOnly(new Date());

    return db.transaction(async (tx) => {
      await lockUserWallet(tx, userId);
      const state = await getWalletState(tx, userId, today);

      const totalBefore = getTotalAvailableCredits({
        purchasedCredits: state.purchasedCredits,
        subscriptions: state.activeSubscriptions,
      });

      await tx
        .update(user)
        .set({
          credits: sql`${user.credits} + ${amount}`,
        })
        .where(eq(user.id, userId));

      const totalAfter = totalBefore + amount;

      await tx.insert(creditTransaction).values({
        id: transactionId,
        userId,
        type: "addition",
        amount,
        balanceBefore: totalBefore,
        balanceAfter: totalAfter,
        reason,
        referenceType,
        referenceId,
      });

      return { transactionId, newBalance: totalAfter };
    });
  },

  async getCreditHistory(
    userId: string,
    limit = 50
  ): Promise<typeof creditTransaction.$inferSelect[]> {
    return db
      .select()
      .from(creditTransaction)
      .where(eq(creditTransaction.userId, userId))
      .orderBy(creditTransaction.createdAt)
      .limit(limit);
  },
};
