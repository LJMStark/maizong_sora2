CREATE TABLE "system_config" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"description" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" text,
	CONSTRAINT "system_config_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "system_config" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "daily_fast_video_limit" integer;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "daily_quality_video_limit" integer;--> statement-breakpoint
ALTER TABLE "system_config" ADD CONSTRAINT "system_config_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;