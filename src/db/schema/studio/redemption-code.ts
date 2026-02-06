import { pgEnum, pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";
import { user } from "../auth/user";

export const redemptionCodeStatusEnum = pgEnum("redemption_code_status", [
  "active",
  "used",
  "expired",
  "disabled",
]);

export const redemptionCode = pgTable("redemption_code", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  credits: integer("credits").notNull(),
  status: redemptionCodeStatusEnum("status").notNull().default("active"),
  expiresAt: timestamp("expires_at"),
  usedBy: text("used_by").references(() => user.id),
  usedAt: timestamp("used_at"),
  createdBy: text("created_by").notNull().references(() => user.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  note: text("note"),
}).enableRLS();

export type RedemptionCodeType = typeof redemptionCode.$inferSelect;
export type RedemptionCodeInsert = typeof redemptionCode.$inferInsert;
