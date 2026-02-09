CREATE TYPE "public"."video_provider" AS ENUM('duomi', 'kie');--> statement-breakpoint
CREATE TABLE "announcement" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text
);
--> statement-breakpoint
ALTER TABLE "announcement" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "video_task" ADD COLUMN "provider" "video_provider" DEFAULT 'duomi' NOT NULL;--> statement-breakpoint
ALTER TABLE "announcement" ADD CONSTRAINT "announcement_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;