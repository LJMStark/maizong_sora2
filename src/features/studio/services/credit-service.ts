import { db } from "@/db";
import { creditTransaction, user } from "@/db/schema";
import { eq } from "drizzle-orm";

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
      throw new Error("User not found");
    }

    return result[0].credits;
  },

  async deductCredits(params: DeductCreditsParams): Promise<{
    transactionId: string;
    newBalance: number;
  }> {
    const { userId, amount, reason, referenceType, referenceId } = params;

    const currentCredits = await this.getUserCredits(userId);

    if (currentCredits < amount) {
      throw new Error("Insufficient credits");
    }

    const newBalance = currentCredits - amount;
    const transactionId = crypto.randomUUID();

    await db.transaction(async (tx) => {
      await tx
        .update(user)
        .set({ credits: newBalance })
        .where(eq(user.id, userId));

      await tx.insert(creditTransaction).values({
        id: transactionId,
        userId,
        type: "deduction",
        amount,
        balanceBefore: currentCredits,
        balanceAfter: newBalance,
        reason,
        referenceType,
        referenceId,
      });
    });

    return { transactionId, newBalance };
  },

  async refundCredits(params: RefundCreditsParams): Promise<{
    transactionId: string;
    newBalance: number;
  }> {
    const { userId, amount, reason, referenceType, referenceId } = params;

    const currentCredits = await this.getUserCredits(userId);
    const newBalance = currentCredits + amount;
    const transactionId = crypto.randomUUID();

    await db.transaction(async (tx) => {
      await tx
        .update(user)
        .set({ credits: newBalance })
        .where(eq(user.id, userId));

      await tx.insert(creditTransaction).values({
        id: transactionId,
        userId,
        type: "refund",
        amount,
        balanceBefore: currentCredits,
        balanceAfter: newBalance,
        reason,
        referenceType,
        referenceId,
      });
    });

    return { transactionId, newBalance };
  },

  async addCredits(params: {
    userId: string;
    amount: number;
    reason: string;
    referenceType?: string;
    referenceId?: string;
  }): Promise<{ transactionId: string; newBalance: number }> {
    const { userId, amount, reason, referenceType, referenceId } = params;

    const currentCredits = await this.getUserCredits(userId);
    const newBalance = currentCredits + amount;
    const transactionId = crypto.randomUUID();

    await db.transaction(async (tx) => {
      await tx
        .update(user)
        .set({ credits: newBalance })
        .where(eq(user.id, userId));

      await tx.insert(creditTransaction).values({
        id: transactionId,
        userId,
        type: "addition",
        amount,
        balanceBefore: currentCredits,
        balanceAfter: newBalance,
        reason,
        referenceType,
        referenceId,
      });
    });

    return { transactionId, newBalance };
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
