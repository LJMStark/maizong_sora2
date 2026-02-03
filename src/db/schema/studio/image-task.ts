import { integer, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "../auth/user";

export const imageModelEnum = pgEnum("image_model", [
  "gemini-3-pro-image-preview",
  "gemini-2.5-flash-image",
]);

export const imageModeEnum = pgEnum("image_mode", ["generate", "edit"]);

export const imageTaskStatusEnum = pgEnum("image_task_status", [
  "pending",
  "running",
  "succeeded",
  "error",
]);

export const imageTask = pgTable("image_task", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  duomiTaskId: text("duomi_task_id"),
  mode: imageModeEnum("mode").notNull(),
  model: imageModelEnum("model").notNull(),
  prompt: text("prompt").notNull(),
  aspectRatio: text("aspect_ratio"),
  sourceImageUrl: text("source_image_url"),
  status: imageTaskStatusEnum("status").notNull().default("pending"),
  errorMessage: text("error_message"),
  duomiImageUrl: text("duomi_image_url"),
  finalImageUrl: text("final_image_url"),
  creditCost: integer("credit_cost").notNull(),
  creditTransactionId: text("credit_transaction_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  completedAt: timestamp("completed_at"),
}).enableRLS();

export type ImageTaskType = typeof imageTask.$inferSelect;
export type ImageTaskInsert = typeof imageTask.$inferInsert;
