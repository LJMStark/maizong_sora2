import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "../auth/user";
import { pptTask } from "./ppt-task";

export const pptSlideStatusEnum = pgEnum("ppt_slide_status", [
  "queued",
  "running",
  "succeeded",
  "error",
  "cancelled",
]);

export interface PptSlideContent {
  bullets: string[];
  layoutRole: "cover" | "toc" | "section" | "content" | "data" | "end";
  promptOverride?: string;
}

export const pptSlide = pgTable(
  "ppt_slide",
  {
    id: text("id").primaryKey(),
    taskId: text("task_id")
      .notNull()
      .references(() => pptTask.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    slideIndex: integer("slide_index").notNull(),
    title: text("title").notNull(),
    content: jsonb("content").$type<PptSlideContent>().notNull(),
    prompt: text("prompt").notNull(),
    speechNotes: text("speech_notes"),
    providerTaskId: text("provider_task_id"),
    status: pptSlideStatusEnum("status").notNull().default("queued"),
    retryCount: integer("retry_count").notNull().default(0),
    errorMessage: text("error_message"),
    duomiImageUrl: text("duomi_image_url"),
    finalImageUrl: text("final_image_url"),
    refunded: boolean("refunded").notNull().default(false),
    regenTransactionId: text("regen_transaction_id"),
    isSample: boolean("is_sample").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
    completedAt: timestamp("completed_at"),
  },
  (table) => [uniqueIndex("ppt_slide_task_index_idx").on(table.taskId, table.slideIndex)]
).enableRLS();

export type PptSlideType = typeof pptSlide.$inferSelect;
export type PptSlideInsert = typeof pptSlide.$inferInsert;
