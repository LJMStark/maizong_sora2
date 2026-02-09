import { integer, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "../auth/user";

export const videoModelEnum = pgEnum("video_model", ["sora-2", "sora-2-temporary", "sora-2-pro"]);

export const videoProviderEnum = pgEnum("video_provider", ["duomi", "kie"]);

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
}).enableRLS();

export type VideoTaskType = typeof videoTask.$inferSelect;
export type VideoTaskInsert = typeof videoTask.$inferInsert;
