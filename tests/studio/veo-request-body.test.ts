import assert from "node:assert/strict";
import test from "node:test";

import { veoService } from "../../src/features/studio/services/veo-service";

type Captured = { url: string; body: Record<string, unknown> };

/** 拦下 fetch，只为检查请求体；不真的打上游。 */
async function captureRequest(
  run: () => Promise<unknown>
): Promise<Captured> {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.DUOMI_API;
  process.env.DUOMI_API = "test-key";

  let captured: Captured | null = null;
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    captured = { url: String(url), body: JSON.parse(String(init.body)) };
    return new Response(JSON.stringify({ id: "task-123" }), { status: 200 });
  }) as unknown as typeof fetch;

  try {
    await run();
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.DUOMI_API;
    else process.env.DUOMI_API = originalKey;
  }

  assert.ok(captured, "没有捕获到请求");
  return captured!;
}

/**
 * 回归测试：文生视频必须带上 `image_urls`，哪怕是空数组。
 *
 * 2026-09-18 实测到的上游行为——`generation_type: "TEXT"` 而请求体里**没有**
 * `image_urls` 这个键时，Duomi 不报错，任务直接永久停在 `pending`：
 *   - 无 generation_type              -> running -> succeeded（约 2 分钟）
 *   - generation_type + image_urls:[] -> running -> succeeded（约 2 分钟）
 *   - generation_type，无 image_urls  -> pending，8 分钟仍无变化
 * 上游文档也把 `image_urls` 列在 required 里。
 *
 * 症状很隐蔽：用户扣了积分、界面一直转圈、没有任何报错，要等
 * `recoverStuckVideoTasks` 的 30 分钟阈值才会被兜底处理。
 */
test("文生视频请求体带 image_urls 空数组，不能省略该键", async () => {
  const { body } = await captureRequest(() =>
    veoService.createVideoTask({
      prompt: "a misty pine forest at dawn",
      aspectRatio: "16:9",
    })
  );

  assert.equal(body.generation_type, "TEXT");
  assert.ok(
    "image_urls" in body,
    "缺少 image_urls 键会让上游把任务永久挂在 pending"
  );
  assert.deepEqual(body.image_urls, []);
});

test("图生视频照常带上图片地址", async () => {
  const { body } = await captureRequest(() =>
    veoService.createVideoTask({
      prompt: "a car drives forward",
      aspectRatio: "9:16",
      imageUrls: ["https://example.com/a.png"],
    })
  );

  assert.equal(body.generation_type, "REFERENCE");
  assert.deepEqual(body.image_urls, ["https://example.com/a.png"]);
});

test("两张图走首尾帧模式", async () => {
  const { body } = await captureRequest(() =>
    veoService.createVideoTask({
      prompt: "morph between two scenes",
      aspectRatio: "16:9",
      imageUrls: ["https://example.com/a.png", "https://example.com/b.png"],
    })
  );

  assert.equal(body.generation_type, "FIRST&LAST");
  assert.equal((body.image_urls as string[]).length, 2);
});

test("图片数量截断到上游上限 3 张", async () => {
  const { body } = await captureRequest(() =>
    veoService.createVideoTask({
      prompt: "many references",
      aspectRatio: "16:9",
      imageUrls: [
        "https://example.com/1.png",
        "https://example.com/2.png",
        "https://example.com/3.png",
        "https://example.com/4.png",
      ],
    })
  );

  assert.equal((body.image_urls as string[]).length, 3);
});

test("模型与时长按上游要求固定", async () => {
  const { body } = await captureRequest(() =>
    veoService.createVideoTask({
      prompt: "anything",
      aspectRatio: "16:9",
    })
  );

  assert.equal(body.model, "veo3.1-fast");
  assert.equal(body.duration, 8, "上游文档写明 duration 固定为 8");
  assert.equal(body.aspect_ratio, "16:9");
});
