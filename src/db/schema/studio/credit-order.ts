import { integer, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "../auth/user";
import { creditPackage } from "./credit-package";

export const creditOrderStatusEnum = pgEnum("credit_order_status", [
  "pending",
  "paid",
  "cancelled",
]);

export const creditOrder = pgTable("credit_order", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  packageId: text("package_id")
    .notNull()
    .references(() => creditPackage.id),
  amount: integer("amount").notNull(),
  status: creditOrderStatusEnum("status").notNull().default("pending"),
  remark: text("remark"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  paidAt: timestamp("paid_at"),
}).enableRLS();

export type CreditOrderType = typeof creditOrder.$inferSelect;
export type CreditOrderInsert = typeof creditOrder.$inferInsert;
