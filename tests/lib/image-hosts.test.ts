import assert from "node:assert/strict";
import test from "node:test";

import { buildRemoteImagePatterns } from "../../src/lib/image-hosts";

test("同域名时去重，不产生重复规则", () => {
  const patterns = buildRemoteImagePatterns({
    supabaseUrl: "https://maizongsora.zeabur.app",
    galleryBase:
      "https://maizongsora.zeabur.app/storage/v1/object/public/studio-assets/gallery/xiaoxiaodong",
  });

  const hosts = new Set(patterns.map((p) => p.hostname));
  assert.deepEqual([...hosts], ["maizongsora.zeabur.app"]);
});

test("灵感库被改到独立 CDN 时，该域名也在白名单里", () => {
  // 漏掉这个域名的后果不是降级，而是 next/image 直接报错、整片空白
  const patterns = buildRemoteImagePatterns({
    supabaseUrl: "https://maizongsora.zeabur.app",
    galleryBase: "https://cdn.example.com/gallery",
  });

  const hosts = new Set(patterns.map((p) => p.hostname));
  assert.equal(hosts.has("cdn.example.com"), true);
  assert.equal(hosts.has("maizongsora.zeabur.app"), true);
});

test("签名链接与公开链接两种路径都放行", () => {
  const patterns = buildRemoteImagePatterns({
    supabaseUrl: "https://a.example.com",
  });

  const paths = patterns.map((p) => p.pathname).sort();
  assert.deepEqual(paths, [
    "/storage/v1/object/public/**",
    "/storage/v1/object/sign/**",
  ]);
});

test("http 源不放行，避免混合内容", () => {
  const patterns = buildRemoteImagePatterns({
    supabaseUrl: "http://insecure.example.com",
  });

  assert.deepEqual(patterns, []);
});

test("未配置或畸形地址时返回空数组而不是抛异常", () => {
  // 构建期读不到 env 很常见（CI 里就只给了占位值），这里不能让构建挂掉
  for (const env of [
    {},
    { supabaseUrl: "" },
    { supabaseUrl: "not-a-url" },
    { supabaseUrl: undefined, galleryBase: undefined },
  ]) {
    assert.deepEqual(buildRemoteImagePatterns(env), []);
  }
});

test("地址前后的空白不影响解析", () => {
  const patterns = buildRemoteImagePatterns({
    supabaseUrl: "  https://a.example.com  ",
  });

  assert.equal(patterns[0]?.hostname, "a.example.com");
});
