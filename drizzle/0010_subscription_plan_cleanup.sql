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
  "credits" = EXCLUDED."credits",
  "daily_credits" = EXCLUDED."daily_credits",
  "duration_days" = EXCLUDED."duration_days",
  "price" = EXCLUDED."price",
  "sort_order" = EXCLUDED."sort_order",
  "is_active" = true;
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
  "name" = EXCLUDED."name",
  "credits" = EXCLUDED."credits",
  "daily_credits" = EXCLUDED."daily_credits",
  "duration_days" = EXCLUDED."duration_days",
  "price" = EXCLUDED."price",
  "sort_order" = EXCLUDED."sort_order",
  "is_active" = true;
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
  'subscription_monthly_pro',
  'Pro 月卡',
  'subscription',
  1200,
  40,
  30,
  59900,
  20,
  true
)
ON CONFLICT ("id") DO UPDATE
SET
  "name" = EXCLUDED."name",
  "credits" = EXCLUDED."credits",
  "daily_credits" = EXCLUDED."daily_credits",
  "duration_days" = EXCLUDED."duration_days",
  "price" = EXCLUDED."price",
  "sort_order" = EXCLUDED."sort_order",
  "is_active" = true;
--> statement-breakpoint

UPDATE "credit_package"
SET "is_active" = false
WHERE
  "type" = 'subscription'
  AND "id" NOT IN (
    'subscription_monthly_trial_199',
    'subscription_monthly_starter',
    'subscription_monthly_pro'
  );
