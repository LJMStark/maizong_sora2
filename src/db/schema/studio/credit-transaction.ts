import { integer, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "../auth/user";

export const creditTransactionTypeEnum = pgEnum("credit_transaction_type", [
  "deduction",
  "addition",
  "refund",
]);

export const creditTransaction = pgTable("credit_transaction", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  type: creditTransactionTypeEnum("type").notNull(),
  amount: integer("amount").notNull(),
  balanceBefore: integer("balance_before").notNull(),
  balanceAfter: integer("balance_after").notNull(),
  reason: text("reason").notNull(),
  referenceType: text("reference_type"),
  referenceId: text("reference_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}).enableRLS();

export type CreditTransactionType = typeof creditTransaction.$inferSelect;
export type CreditTransactionInsert = typeof creditTransaction.$inferInsert;
