import { sql } from "drizzle-orm";
import {
  check,
  date,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { user } from "../auth/user";
import { creditPackage } from "./credit-package";

export const userSubscriptionStatusEnum = pgEnum("user_subscription_status", [
  "active",
  "expired",
]);

export const userSubscription = pgTable("user_subscription", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  packageId: text("package_id")
    .notNull()
    .references(() => creditPackage.id),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  dailyCredits: integer("daily_credits").notNull(),
  dailyCreditsRemaining: integer("daily_credits_remaining").notNull().default(0),
  monthlyCredits: integer("monthly_credits").notNull().default(0),
  monthlyCreditsRemaining: integer("monthly_credits_remaining").notNull().default(0),
  monthlyCycleIndex: integer("monthly_cycle_index").notNull().default(0),
  lastGrantDate: date("last_grant_date"),
  status: userSubscriptionStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  // 订阅额度不能为负。应用层已有校验，但挡不住并发竞态与手工改库。
  // 只约束「非负」这一条铁律——像「剩余不超过配额」这类看似合理的
  // 不变量，会在管理员下调套餐额度时把老用户的正常操作打死。
  check(
    "user_subscription_credits_non_negative",
    sql`${table.dailyCredits} >= 0 and ${table.dailyCreditsRemaining} >= 0
      and ${table.monthlyCredits} >= 0 and ${table.monthlyCreditsRemaining} >= 0
      and ${table.monthlyCycleIndex} >= 0`
  ),
]).enableRLS();

export type UserSubscriptionType = typeof userSubscription.$inferSelect;
export type UserSubscriptionInsert = typeof userSubscription.$inferInsert;
