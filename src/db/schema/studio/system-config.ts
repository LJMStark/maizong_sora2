import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "../auth/user";

export const systemConfig = pgTable("system_config", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedBy: text("updated_by").references(() => user.id),
}).enableRLS();

export type SystemConfigType = typeof systemConfig.$inferSelect;
export type SystemConfigInsert = typeof systemConfig.$inferInsert;
