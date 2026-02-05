import {
  boolean,
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
}).enableRLS();

export type CreditPackageType = typeof creditPackage.$inferSelect;
export type CreditPackageInsert = typeof creditPackage.$inferInsert;
