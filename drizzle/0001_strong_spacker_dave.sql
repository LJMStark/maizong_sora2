CREATE TYPE "public"."image_mode" AS ENUM('generate', 'edit');--> statement-breakpoint
CREATE TYPE "public"."image_model" AS ENUM('gemini-3-pro-image-preview', 'gemini-2.5-flash-image');--> statement-breakpoint
CREATE TYPE "public"."image_task_status" AS ENUM('pending', 'running', 'succeeded', 'error');--> statement-breakpoint
CREATE TABLE "image_task" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"duomi_task_id" text,
	"mode" "image_mode" NOT NULL,
	"model" "image_model" NOT NULL,
	"prompt" text NOT NULL,
	"aspect_ratio" text,
	"source_image_url" text,
	"status" "image_task_status" DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"duomi_image_url" text,
	"final_image_url" text,
	"credit_cost" integer NOT NULL,
	"credit_transaction_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "image_task" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "image_task" ADD CONSTRAINT "image_task_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;