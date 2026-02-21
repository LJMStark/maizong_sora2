ALTER TABLE "user_subscription"
ADD COLUMN IF NOT EXISTS "daily_credits_remaining" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "user_subscription"
ADD COLUMN IF NOT EXISTS "monthly_credits" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "user_subscription"
ADD COLUMN IF NOT EXISTS "monthly_credits_remaining" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "user_subscription"
ADD COLUMN IF NOT EXISTS "monthly_cycle_index" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "credit_transaction"
ADD COLUMN IF NOT EXISTS "metadata" jsonb;
--> statement-breakpoint

UPDATE "user_subscription" us
SET
  "daily_credits_remaining" = GREATEST(0, COALESCE(us."daily_credits", 0)),
  "monthly_credits" = GREATEST(0, COALESCE(cp."credits", 0)),
  "monthly_credits_remaining" = GREATEST(0, COALESCE(cp."credits", 0)),
  "monthly_cycle_index" = GREATEST(0, COALESCE(us."monthly_cycle_index", 0))
FROM "credit_package" cp
WHERE us."package_id" = cp."id";
--> statement-breakpoint

INSERT INTO "credit_package" (
  "id",
  "name",
  "type",
  "credits",
  "daily_credits",
  "duration_days",
  "price",
  "sort_order",
  "is_active"
) VALUES (
  'subscription_monthly_trial_199',
  '月卡 Trial 试用版',
  'subscription',
  60,
  5,
  30,
  1990,
  5,
  true
)
ON CONFLICT ("id") DO UPDATE
SET
  "name" = EXCLUDED."name",
  "type" = EXCLUDED."type",
  "credits" = EXCLUDED."credits",
  "daily_credits" = EXCLUDED."daily_credits",
  "duration_days" = EXCLUDED."duration_days",
  "price" = EXCLUDED."price",
  "sort_order" = EXCLUDED."sort_order",
  "is_active" = EXCLUDED."is_active";
--> statement-breakpoint

INSERT INTO "credit_package" (
  "id",
  "name",
  "type",
  "credits",
  "daily_credits",
  "duration_days",
  "price",
  "sort_order",
  "is_active"
) VALUES (
  'subscription_monthly_starter',
  'Starter 月卡',
  'subscription',
  200,
  10,
  30,
  19900,
  10,
  true
)
ON CONFLICT ("id") DO UPDATE
SET
  "credits" = 200,
  "duration_days" = 30,
  "is_active" = true;
--> statement-breakpoint

UPDATE "credit_package"
SET "credits" = 200
WHERE
  "type" = 'subscription'
  AND (
    "id" = 'subscription_monthly_starter'
    OR lower("name") LIKE '%starter%'
  );
--> statement-breakpoint

INSERT INTO "system_config" (
  "id",
  "key",
  "value",
  "description",
  "updated_at"
) VALUES (
  'syscfg_credit_cost_image',
  'credit_cost_image',
  '5',
  '图片生成积分消耗',
  now()
)
ON CONFLICT ("key") DO UPDATE
SET
  "value" = EXCLUDED."value",
  "description" = EXCLUDED."description",
  "updated_at" = now();
