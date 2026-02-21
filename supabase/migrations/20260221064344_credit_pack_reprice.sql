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
  '积分包 Mini',
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
  "type" = EXCLUDED."type",
  "credits" = EXCLUDED."credits",
  "daily_credits" = NULL,
  "duration_days" = NULL,
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
  '积分包 Plus',
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
  "type" = EXCLUDED."type",
  "credits" = EXCLUDED."credits",
  "daily_credits" = NULL,
  "duration_days" = NULL,
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
  '积分包 Max',
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
  "type" = EXCLUDED."type",
  "credits" = EXCLUDED."credits",
  "daily_credits" = NULL,
  "duration_days" = NULL,
  "price" = EXCLUDED."price",
  "sort_order" = EXCLUDED."sort_order",
  "is_active" = true;
--> statement-breakpoint

UPDATE "credit_package"
SET "is_active" = false
WHERE
  "type" = 'package'
  AND "id" NOT IN ('package_mini_199', 'package_plus_199', 'package_max_998');
