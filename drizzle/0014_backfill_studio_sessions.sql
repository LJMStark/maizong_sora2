INSERT INTO "studio_session" ("id", "user_id", "type", "title", "created_at", "updated_at")
SELECT
  'img_' || "id",
  "user_id",
  'image'::"studio_session_type",
  COALESCE(NULLIF(left("prompt", 40), ''), '未命名图像'),
  "created_at",
  "updated_at"
FROM "image_task"
WHERE "session_id" IS NULL
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
UPDATE "image_task"
SET "session_id" = 'img_' || "id"
WHERE "session_id" IS NULL
  AND EXISTS (
    SELECT 1
    FROM "studio_session"
    WHERE "studio_session"."id" = 'img_' || "image_task"."id"
  );
--> statement-breakpoint
INSERT INTO "studio_session" ("id", "user_id", "type", "title", "created_at", "updated_at")
SELECT
  'vid_' || "id",
  "user_id",
  'video'::"studio_session_type",
  COALESCE(NULLIF(left("prompt", 40), ''), '未命名视频'),
  "created_at",
  "updated_at"
FROM "video_task"
WHERE "session_id" IS NULL
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
UPDATE "video_task"
SET "session_id" = 'vid_' || "id"
WHERE "session_id" IS NULL
  AND EXISTS (
    SELECT 1
    FROM "studio_session"
    WHERE "studio_session"."id" = 'vid_' || "video_task"."id"
  );
