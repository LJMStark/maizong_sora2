import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  username: text("username").unique(),
  displayUsername: text("display_username"),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull(),
  image: text("image"),
  role: text("role").default("member").notNull(),
  gender: boolean("gender").notNull(),
  credits: integer("credits").notNull().default(50),
  dailyFastVideoLimit: integer("daily_fast_video_limit"),
  dailyQualityVideoLimit: integer("daily_quality_video_limit"),
  dailyPptLimit: integer("daily_ppt_limit"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .$onUpdate(() => new Date()),
}, (table) => [
  // 余额永远不能为负。应用层已有 advisory lock + 事务校验，但那挡不住
  // 并发竞态漏网、也挡不住运维手工改库——这是最后一道防线。
  // 每日限额字段不加约束：-1 表示不限、null 表示用全局配置，语义不是「非负」。
  check("user_credits_non_negative", sql`${table.credits} >= 0`),
]).enableRLS();

export type UserType = typeof user.$inferSelect;
