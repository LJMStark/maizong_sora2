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
  '体验月卡',
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
  '超值月卡',
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
  '专业月卡',
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
  'subscription_yearly_flagship_3800',
  '无敌年卡',
  'subscription',
  8000,
  300,
  365,
  380000,
  30,
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
    'subscription_monthly_pro',
    'subscription_yearly_flagship_3800'
  );
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
  'package_mini_199',
  '启智积分包（基础版）',
  'package',
  120,
  NULL,
  NULL,
  1990,
  10,
  true
)
ON CONFLICT ("id") DO UPDATE
SET
  "name" = EXCLUDED."name",
  "credits" = EXCLUDED."credits",
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
  'package_plus_199',
  '迅驰智算套餐（进阶版）',
  'package',
  1280,
  NULL,
  NULL,
  19900,
  20,
  true
)
ON CONFLICT ("id") DO UPDATE
SET
  "name" = EXCLUDED."name",
  "credits" = EXCLUDED."credits",
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
  'package_max_998',
  '星云超算方案（高级版）',
  'package',
  6600,
  NULL,
  NULL,
  99800,
  30,
  true
)
ON CONFLICT ("id") DO UPDATE
SET
  "name" = EXCLUDED."name",
  "credits" = EXCLUDED."credits",
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
  'package_premium_6666',
  '银河尊享包（尊贵版）',
  'package',
  48000,
  NULL,
  NULL,
  666600,
  40,
  true
)
ON CONFLICT ("id") DO UPDATE
SET
  "name" = EXCLUDED."name",
  "credits" = EXCLUDED."credits",
  "price" = EXCLUDED."price",
  "sort_order" = EXCLUDED."sort_order",
  "is_active" = true;
--> statement-breakpoint

UPDATE "credit_package"
SET "is_active" = false
WHERE
  "type" = 'package'
  AND "id" NOT IN (
    'package_mini_199',
    'package_plus_199',
    'package_max_998',
    'package_premium_6666'
  );
