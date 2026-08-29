import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { user } from "../auth/user";
import { studioSession } from "./studio-session";

export const videoModelEnum = pgEnum("video_model", ["sora-2", "sora-2-temporary", "sora-2-pro", "veo3.1-fast"]);

export const videoProviderEnum = pgEnum("video_provider", ["duomi", "kie", "veo"]);

export const videoTaskStatusEnum = pgEnum("video_task_status", [
  "pending",
  "running",
  "succeeded",
  "error",
  "retrying",
]);

export const videoTask = pgTable("video_task", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  sessionId: text("session_id").references(() => studioSession.id, {
    onDelete: "set null",
  }),
  duomiTaskId: text("duomi_task_id"),
  provider: videoProviderEnum("provider").notNull().default("duomi"),
  model: videoModelEnum("model").notNull(),
  prompt: text("prompt").notNull(),
  aspectRatio: text("aspect_ratio").notNull(),
  duration: integer("duration").notNull(),
  sourceImageUrl: text("source_image_url"),
  status: videoTaskStatusEnum("status").notNull().default("pending"),
  progress: integer("progress").notNull().default(0),
  errorMessage: text("error_message"),
  duomiVideoUrl: text("duomi_video_url"),
  finalVideoUrl: text("final_video_url"),
  creditCost: integer("credit_cost").notNull(),
  creditTransactionId: text("credit_transaction_id"),
  generateRetryCount: integer("generate_retry_count").notNull().default(0),
  callbackRetryCount: integer("callback_retry_count").notNull().default(0),
  lastRetryAt: timestamp("last_retry_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  completedAt: timestamp("completed_at"),
}, (table) => [
  // 对账任务每分钟扫描在途任务。绝大多数行最终是终态，用部分索引把
  // 索引体积压到只覆盖活跃行，写入开销几乎为零。
  index("video_task_active_idx")
    .on(table.status, table.updatedAt)
    .where(sql`${table.status} in ('pending', 'running', 'retrying')`),
  // 对账扫描"已失败但可能漏退款"的任务
  index("video_task_error_idx")
    .on(table.updatedAt)
    .where(sql`${table.status} = 'error'`),
  check(
    "video_task_amounts_non_negative",
    sql`${table.creditCost} >= 0 and ${table.progress} >= 0`
  ),
]).enableRLS();

export type VideoTaskType = typeof videoTask.$inferSelect;
export type VideoTaskInsert = typeof videoTask.$inferInsert;
