import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const creditPackageTypeEnum = pgEnum("credit_package_type", [
  "package",
  "subscription",
]);

export const creditPackage = pgTable("credit_package", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: creditPackageTypeEnum("type").notNull(),
  credits: integer("credits"),
  dailyCredits: integer("daily_credits"),
  durationDays: integer("duration_days"),
  price: integer("price").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  // 售卖参数不能为负（credits/dailyCredits/durationDays 允许为 null，
  // 表示该套餐类型不适用该字段）
  check(
    "credit_package_amounts_non_negative",
    sql`${table.price} >= 0
      and (${table.credits} is null or ${table.credits} >= 0)
      and (${table.dailyCredits} is null or ${table.dailyCredits} >= 0)
      and (${table.durationDays} is null or ${table.durationDays} >= 0)`
  ),
]).enableRLS();

export type CreditPackageType = typeof creditPackage.$inferSelect;
export type CreditPackageInsert = typeof creditPackage.$inferInsert;
