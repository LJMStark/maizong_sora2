import { date, integer, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";
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
}).enableRLS();

export type UserSubscriptionType = typeof userSubscription.$inferSelect;
export type UserSubscriptionInsert = typeof userSubscription.$inferInsert;
