import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { user } from "../auth/user";
import { studioSession } from "./studio-session";

export const pptTaskStatusEnum = pgEnum("ppt_task_status", [
  "pending",
  "generating_sample",
  "awaiting_confirm",
  "generating",
  "succeeded",
  "partial",
  "error",
  "cancelled",
]);

export const pptResolutionEnum = pgEnum("ppt_resolution", ["2k", "4k"]);

export interface PptOutlineSlide {
  index: number;
  title: string;
  bullets: string[];
  layoutRole: "cover" | "toc" | "section" | "content" | "data" | "end";
  promptOverride?: string;
}

export interface PptTemplateProfile {
  palette: string[];
  fonts: string[];
  layoutTraits: string;
  background: string;
  motifs: string;
}

export const pptTask = pgTable("ppt_task", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  sessionId: text("session_id").references(() => studioSession.id, {
    onDelete: "set null",
  }),
  title: text("title").notNull(),
  skillKey: text("skill_key").notNull(),
  styleKey: text("style_key").notNull(),
  anchorColor: text("anchor_color"),
  resolution: pptResolutionEnum("resolution").notNull().default("2k"),
  aspectRatio: text("aspect_ratio").notNull().default("16:9"),
  pageCount: integer("page_count").notNull(),
  outline: jsonb("outline").$type<PptOutlineSlide[]>().notNull(),
  templateProfile: jsonb("template_profile").$type<PptTemplateProfile>(),
  templateRefImageUrls: jsonb("template_ref_image_urls").$type<string[]>(),
  sampleFirst: boolean("sample_first").notNull().default(true),
  speechNotesEnabled: boolean("speech_notes_enabled").notNull().default(false),
  status: pptTaskStatusEnum("status").notNull().default("pending"),
  errorMessage: text("error_message"),
  creditCostPerPage: integer("credit_cost_per_page").notNull(),
  creditCostTotal: integer("credit_cost_total").notNull(),
  creditTransactionId: text("credit_transaction_id"),
  refundedCredits: integer("refunded_credits").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  completedAt: timestamp("completed_at"),
}).enableRLS();

export type PptTaskType = typeof pptTask.$inferSelect;
export type PptTaskInsert = typeof pptTask.$inferInsert;
