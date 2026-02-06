CREATE TYPE "public"."redemption_code_status" AS ENUM('active', 'used', 'expired', 'disabled');--> statement-breakpoint
CREATE TABLE "redemption_code" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"credits" integer NOT NULL,
	"status" "redemption_code_status" DEFAULT 'active' NOT NULL,
	"expires_at" timestamp,
	"used_by" text,
	"used_at" timestamp,
	"created_by" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"note" text,
	CONSTRAINT "redemption_code_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "redemption_code" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "redemption_code" ADD CONSTRAINT "redemption_code_used_by_user_id_fk" FOREIGN KEY ("used_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "redemption_code" ADD CONSTRAINT "redemption_code_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;