import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { user } from "../auth/user";

export const creditTransactionTypeEnum = pgEnum("credit_transaction_type", [
  "deduction",
  "addition",
  "refund",
]);

export const creditTransaction = pgTable(
  "credit_transaction",
  {
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
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    // 积分流水按用户查询（余额历史、对账时的退款存在性检查）
    index("credit_transaction_user_type_idx").on(table.userId, table.type),
    // 对账按 referenceType+referenceId 反查是否已退款
    index("credit_transaction_reference_idx").on(
      table.referenceType,
      table.referenceId
    ),
    // 退款按原扣费流水溯源（metadata->>'sourceTransactionId'）。
    // 只对这一个固定 key 建表达式索引；整列 GIN 对 ->> 相等查询不生效，
    // 且会拖慢这张高频写入表。
    index("credit_transaction_source_txn_idx").on(
      sql`(${table.metadata} ->> 'sourceTransactionId')`
    ),
    // 三种类型的 amount 一律存正数（方向由 type 表达），余额快照非负
    check(
      "credit_transaction_amounts_non_negative",
      sql`${table.amount} >= 0 and ${table.balanceBefore} >= 0 and ${table.balanceAfter} >= 0`
    ),
  ]
).enableRLS();

export type CreditTransactionType = typeof creditTransaction.$inferSelect;
export type CreditTransactionInsert = typeof creditTransaction.$inferInsert;
