CREATE TYPE "public"."studio_session_type" AS ENUM('image', 'video');--> statement-breakpoint
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
ALTER TABLE "studio_session" ADD CONSTRAINT "studio_session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "image_task" ADD COLUMN "session_id" text;--> statement-breakpoint
ALTER TABLE "video_task" ADD COLUMN "session_id" text;--> statement-breakpoint
ALTER TABLE "image_task" ADD CONSTRAINT "image_task_session_id_studio_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."studio_session"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_task" ADD CONSTRAINT "video_task_session_id_studio_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."studio_session"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "studio_session_user_type_updated_idx" ON "studio_session" ("user_id", "type", "updated_at");--> statement-breakpoint
CREATE INDEX "image_task_session_id_idx" ON "image_task" ("session_id");--> statement-breakpoint
CREATE INDEX "video_task_session_id_idx" ON "video_task" ("session_id");
