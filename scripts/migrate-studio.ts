import "dotenv/config";
import postgres from "postgres";

const directUrl = process.env.DIRECT_URL;
if (!directUrl) {
  throw new Error("DIRECT_URL environment variable is required");
}

const sql = postgres(directUrl);

async function migrate() {
  console.log("Starting migration...");

  try {
    // 添加 video_model 枚举类型
    await sql`
      DO $$ BEGIN
          CREATE TYPE "public"."video_model" AS ENUM('sora-2', 'sora-2-pro');
      EXCEPTION
          WHEN duplicate_object THEN null;
      END $$;
    `;
    console.log("Created video_model enum");

    // 添加 video_task_status 枚举类型
    await sql`
      DO $$ BEGIN
          CREATE TYPE "public"."video_task_status" AS ENUM('pending', 'running', 'succeeded', 'error');
      EXCEPTION
          WHEN duplicate_object THEN null;
      END $$;
    `;
    console.log("Created video_task_status enum");

    // 添加 credit_transaction_type 枚举类型
    await sql`
      DO $$ BEGIN
          CREATE TYPE "public"."credit_transaction_type" AS ENUM('deduction', 'addition', 'refund');
      EXCEPTION
          WHEN duplicate_object THEN null;
      END $$;
    `;
    console.log("Created credit_transaction_type enum");

    // 添加 credits 字段到 user 表
    await sql`
      DO $$ BEGIN
          ALTER TABLE "user" ADD COLUMN "credits" integer DEFAULT 50 NOT NULL;
      EXCEPTION
          WHEN duplicate_column THEN null;
      END $$;
    `;
    console.log("Added credits column to user table");

    // 创建 video_task 表
    await sql`
      CREATE TABLE IF NOT EXISTS "video_task" (
          "id" text PRIMARY KEY NOT NULL,
          "user_id" text NOT NULL,
          "duomi_task_id" text,
          "model" "video_model" NOT NULL,
          "prompt" text NOT NULL,
          "aspect_ratio" text NOT NULL,
          "duration" integer NOT NULL,
          "source_image_url" text,
          "status" "video_task_status" DEFAULT 'pending' NOT NULL,
          "progress" integer DEFAULT 0 NOT NULL,
          "error_message" text,
          "duomi_video_url" text,
          "final_video_url" text,
          "credit_cost" integer NOT NULL,
          "credit_transaction_id" text,
          "created_at" timestamp DEFAULT now() NOT NULL,
          "updated_at" timestamp DEFAULT now() NOT NULL,
          "completed_at" timestamp
      )
    `;
    console.log("Created video_task table");

    // 启用 RLS
    await sql`ALTER TABLE "video_task" ENABLE ROW LEVEL SECURITY`;
    console.log("Enabled RLS on video_task");

    // 添加外键约束
    await sql`
      DO $$ BEGIN
          ALTER TABLE "video_task" ADD CONSTRAINT "video_task_user_id_user_id_fk"
          FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
      EXCEPTION
          WHEN duplicate_object THEN null;
      END $$;
    `;
    console.log("Added foreign key to video_task");

    // 创建 credit_transaction 表
    await sql`
      CREATE TABLE IF NOT EXISTS "credit_transaction" (
          "id" text PRIMARY KEY NOT NULL,
          "user_id" text NOT NULL,
          "type" "credit_transaction_type" NOT NULL,
          "amount" integer NOT NULL,
          "balance_before" integer NOT NULL,
          "balance_after" integer NOT NULL,
          "reason" text NOT NULL,
          "reference_type" text,
          "reference_id" text,
          "created_at" timestamp DEFAULT now() NOT NULL
      )
    `;
    console.log("Created credit_transaction table");

    // 启用 RLS
    await sql`ALTER TABLE "credit_transaction" ENABLE ROW LEVEL SECURITY`;
    console.log("Enabled RLS on credit_transaction");

    // 添加外键约束
    await sql`
      DO $$ BEGIN
          ALTER TABLE "credit_transaction" ADD CONSTRAINT "credit_transaction_user_id_user_id_fk"
          FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
      EXCEPTION
          WHEN duplicate_object THEN null;
      END $$;
    `;
    console.log("Added foreign key to credit_transaction");

    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

migrate();
