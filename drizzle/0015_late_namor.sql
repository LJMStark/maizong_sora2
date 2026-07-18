CREATE TYPE "public"."ppt_resolution" AS ENUM('2k', '4k');--> statement-breakpoint
CREATE TYPE "public"."ppt_task_status" AS ENUM('pending', 'generating_sample', 'awaiting_confirm', 'generating', 'succeeded', 'partial', 'error', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."ppt_slide_status" AS ENUM('queued', 'running', 'succeeded', 'error', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."studio_session_type" AS ENUM('image', 'video', 'ppt');--> statement-breakpoint
ALTER TYPE "public"."video_model" ADD VALUE 'veo3.1-fast';--> statement-breakpoint
ALTER TYPE "public"."video_provider" ADD VALUE 'veo';--> statement-breakpoint
CREATE TABLE "ppt_task" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"session_id" text,
	"title" text NOT NULL,
	"skill_key" text NOT NULL,
	"style_key" text NOT NULL,
	"anchor_color" text,
	"resolution" "ppt_resolution" DEFAULT '2k' NOT NULL,
	"aspect_ratio" text DEFAULT '16:9' NOT NULL,
	"page_count" integer NOT NULL,
	"outline" jsonb NOT NULL,
	"template_profile" jsonb,
	"template_ref_image_urls" jsonb,
	"sample_first" boolean DEFAULT true NOT NULL,
	"speech_notes_enabled" boolean DEFAULT false NOT NULL,
	"status" "ppt_task_status" DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"credit_cost_per_page" integer NOT NULL,
	"credit_cost_total" integer NOT NULL,
	"credit_transaction_id" text,
	"refunded_credits" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "ppt_task" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "ppt_slide" (
	"id" text PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"user_id" text NOT NULL,
	"slide_index" integer NOT NULL,
	"title" text NOT NULL,
	"content" jsonb NOT NULL,
	"prompt" text NOT NULL,
	"speech_notes" text,
	"provider_task_id" text,
	"status" "ppt_slide_status" DEFAULT 'queued' NOT NULL,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"duomi_image_url" text,
	"final_image_url" text,
	"refunded" boolean DEFAULT false NOT NULL,
	"regen_transaction_id" text,
	"is_sample" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "ppt_slide" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "studio_session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" "studio_session_type" NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "studio_session" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "daily_ppt_limit" integer;--> statement-breakpoint
ALTER TABLE "video_task" ADD COLUMN "session_id" text;--> statement-breakpoint
ALTER TABLE "credit_transaction" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "image_task" ADD COLUMN "session_id" text;--> statement-breakpoint
ALTER TABLE "user_subscription" ADD COLUMN "daily_credits_remaining" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_subscription" ADD COLUMN "monthly_credits" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_subscription" ADD COLUMN "monthly_credits_remaining" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "user_subscription" ADD COLUMN "monthly_cycle_index" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "ppt_task" ADD CONSTRAINT "ppt_task_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ppt_task" ADD CONSTRAINT "ppt_task_session_id_studio_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."studio_session"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ppt_slide" ADD CONSTRAINT "ppt_slide_task_id_ppt_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."ppt_task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ppt_slide" ADD CONSTRAINT "ppt_slide_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio_session" ADD CONSTRAINT "studio_session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ppt_slide_task_index_idx" ON "ppt_slide" USING btree ("task_id","slide_index");--> statement-breakpoint
ALTER TABLE "video_task" ADD CONSTRAINT "video_task_session_id_studio_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."studio_session"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "image_task" ADD CONSTRAINT "image_task_session_id_studio_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."studio_session"("id") ON DELETE set null ON UPDATE no action;