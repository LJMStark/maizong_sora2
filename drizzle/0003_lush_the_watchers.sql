ALTER TYPE "public"."video_task_status" ADD VALUE 'retrying';--> statement-breakpoint
ALTER TABLE "video_task" ADD COLUMN "generate_retry_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "video_task" ADD COLUMN "callback_retry_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "video_task" ADD COLUMN "last_retry_at" timestamp;