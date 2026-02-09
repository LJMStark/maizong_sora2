import { boolean, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "../auth/user";

export const announcement = pgTable("announcement", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  createdBy: text("created_by").references(() => user.id),
}).enableRLS();

export type AnnouncementType = typeof announcement.$inferSelect;
export type AnnouncementInsert = typeof announcement.$inferInsert;
