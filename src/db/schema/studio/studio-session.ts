import { pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "../auth/user";

export const studioSessionTypeEnum = pgEnum("studio_session_type", [
  "image",
  "video",
]);

export const studioSession = pgTable("studio_session", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  type: studioSessionTypeEnum("type").notNull(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
}).enableRLS();

export type StudioSessionType = typeof studioSession.$inferSelect;
export type StudioSessionInsert = typeof studioSession.$inferInsert;
