import { db } from "@/db";
import { creditTransaction, user } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

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
}

export const creditService = {
  async getUserCredits(userId: string): Promise<number> {
    const result = await db
      .select({ credits: user.credits })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (result.length === 0) {
      throw new Error("用户不存在");
    }

    return result[0].credits;
  },

  async deductCredits(params: DeductCreditsParams): Promise<{
    transactionId: string;
    newBalance: number;
  }> {
    const { userId, amount, reason, referenceType, referenceId } = params;
    const transactionId = crypto.randomUUID();

    // 使用原子操作防止竞态条件
    const result = await db.transaction(async (tx) => {
      // 使用 SQL 原子更新，只有余额足够时才扣除
      const updateResult = await tx
        .update(user)
        .set({
          credits: sql`${user.credits} - ${amount}`,
        })
        .where(eq(user.id, userId))
        .returning({
          newBalance: user.credits,
        });

      if (updateResult.length === 0) {
        throw new Error("用户不存在");
      }

      const newBalance = updateResult[0].newBalance;

      // 检查更新后余额是否为负（说明原余额不足）
      if (newBalance < 0) {
        // 回滚事务
        throw new Error("积分不足");
      }

      const balanceBefore = newBalance + amount;

      await tx.insert(creditTransaction).values({
        id: transactionId,
        userId,
        type: "deduction",
        amount,
        balanceBefore,
        balanceAfter: newBalance,
        reason,
        referenceType,
        referenceId,
      });

      return { transactionId, newBalance };
    });

    return result;
  },

  async refundCredits(params: RefundCreditsParams): Promise<{
    transactionId: string;
    newBalance: number;
  }> {
    const { userId, amount, reason, referenceType, referenceId } = params;
    const transactionId = crypto.randomUUID();

    // 使用原子操作防止竞态条件
    const result = await db.transaction(async (tx) => {
      const updateResult = await tx
        .update(user)
        .set({
          credits: sql`${user.credits} + ${amount}`,
        })
        .where(eq(user.id, userId))
        .returning({
          newBalance: user.credits,
        });

      if (updateResult.length === 0) {
        throw new Error("用户不存在");
      }

      const newBalance = updateResult[0].newBalance;
      const balanceBefore = newBalance - amount;

      await tx.insert(creditTransaction).values({
        id: transactionId,
        userId,
        type: "refund",
        amount,
        balanceBefore,
        balanceAfter: newBalance,
        reason,
        referenceType,
        referenceId,
      });

      return { transactionId, newBalance };
    });

    return result;
  },

  async addCredits(params: {
    userId: string;
    amount: number;
    reason: string;
    referenceType?: string;
    referenceId?: string;
  }): Promise<{ transactionId: string; newBalance: number }> {
    const { userId, amount, reason, referenceType, referenceId } = params;
    const transactionId = crypto.randomUUID();

    // 使用原子操作防止竞态条件
    const result = await db.transaction(async (tx) => {
      const updateResult = await tx
        .update(user)
        .set({
          credits: sql`${user.credits} + ${amount}`,
        })
        .where(eq(user.id, userId))
        .returning({
          newBalance: user.credits,
        });

      if (updateResult.length === 0) {
        throw new Error("用户不存在");
      }

      const newBalance = updateResult[0].newBalance;
      const balanceBefore = newBalance - amount;

      await tx.insert(creditTransaction).values({
        id: transactionId,
        userId,
        type: "addition",
        amount,
        balanceBefore,
        balanceAfter: newBalance,
        reason,
        referenceType,
        referenceId,
      });

      return { transactionId, newBalance };
    });

    return result;
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
