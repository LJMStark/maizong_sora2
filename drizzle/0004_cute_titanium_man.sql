CREATE TYPE "public"."credit_package_type" AS ENUM('package', 'subscription');--> statement-breakpoint
CREATE TYPE "public"."user_subscription_status" AS ENUM('active', 'expired');--> statement-breakpoint
CREATE TYPE "public"."credit_order_status" AS ENUM('pending', 'paid', 'cancelled');--> statement-breakpoint
CREATE TABLE "credit_package" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" "credit_package_type" NOT NULL,
	"credits" integer,
	"daily_credits" integer,
	"duration_days" integer,
	"price" integer NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "credit_package" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "user_subscription" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"package_id" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"daily_credits" integer NOT NULL,
	"last_grant_date" date,
	"status" "user_subscription_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_subscription" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "credit_order" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"package_id" text NOT NULL,
	"amount" integer NOT NULL,
	"status" "credit_order_status" DEFAULT 'pending' NOT NULL,
	"remark" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"paid_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "credit_order" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_subscription" ADD CONSTRAINT "user_subscription_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_subscription" ADD CONSTRAINT "user_subscription_package_id_credit_package_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."credit_package"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_order" ADD CONSTRAINT "credit_order_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_order" ADD CONSTRAINT "credit_order_package_id_credit_package_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."credit_package"("id") ON DELETE no action ON UPDATE no action;