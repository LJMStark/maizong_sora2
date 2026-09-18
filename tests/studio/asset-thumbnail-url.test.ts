import assert from "node:assert/strict";
import test from "node:test";

import {
  THUMBNAIL_TRANSFORM,
  isTransformableImagePath,
} from "../../src/features/studio/services/storage-transform";

test("常见图片扩展名可以走图片变换", () => {
  for (const path of [
    "users/u1/images/a.png",
    "users/u1/images/a.jpg",
    "users/u1/images/a.jpeg",
    "users/u1/images/a.webp",
    "users/u1/ppt/1.PNG",
  ]) {
    assert.equal(isTransformableImagePath(path), true, `${path} 应可变换`);
  }
});

test("视频不能走图片变换——imgproxy 渲染不了 mp4", () => {
  for (const path of [
    "users/u1/videos/a.mp4",
    "users/u1/videos/a.mov",
    "users/u1/videos/a.webm",
  ]) {
    assert.equal(isTransformableImagePath(path), false, `${path} 不该走变换`);
  }
});

test("gif / svg 不走变换", () => {
  // gif 变换会丢掉动画；svg 是矢量，缩放没有意义且 imgproxy 处理有风险
  assert.equal(isTransformableImagePath("users/u1/a.gif"), false);
  assert.equal(isTransformableImagePath("users/u1/a.svg"), false);
});

test("无扩展名或畸形路径不走变换，避免把错误留到渲染时", () => {
  for (const path of ["users/u1/images/noext", "", "users/u1/images/", "."]) {
    assert.equal(isTransformableImagePath(path), false, `${path} 不该走变换`);
  }
});

test("查询串与大小写不影响判定", () => {
  assert.equal(isTransformableImagePath("users/u1/a.PNG?x=1"), true);
  assert.equal(isTransformableImagePath("users/u1/a.MP4?x=1"), false);
});

test("变换宽度覆盖全站最大展示位的 2x 屏", () => {
  // 最大展示位是参考图预览约 560px，2x 需要 1120——1024 已足够接近，
  // 而且实测里 1024 就是源图原始宽度，等于没有分辨率损失
  assert.ok(
    THUMBNAIL_TRANSFORM.width >= 1024,
    "宽度低于 1024 会让对话流里的成品图在高密度屏上发虚"
  );
});

test("必须显式给 quality，否则 PNG 源只被缩放、体积仍然很大", () => {
  // 实测：只传 width 不传 quality 时返回的仍是 1MB 的 PNG
  assert.ok(
    THUMBNAIL_TRANSFORM.quality > 0 && THUMBNAIL_TRANSFORM.quality <= 100
  );
});
