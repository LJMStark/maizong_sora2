import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";

import { proxy } from "../../src/proxy";
import { authGatedRoutePrefixes, publicRoutes } from "../../src/routes";

const ORIGIN = "https://sora2.681023.xyz";

function anonymousRequest(pathname: string): NextRequest {
  return new NextRequest(new URL(pathname, ORIGIN));
}

function signedInRequest(pathname: string): NextRequest {
  const request = new NextRequest(new URL(pathname, ORIGIN));
  // better-auth 在 https 下用 __Secure- 前缀，本地用裸名；两个都带上，
  // 让断言不依赖 NODE_ENV
  request.cookies.set("better-auth.session_token", "test-token");
  request.cookies.set("__Secure-better-auth.session_token", "test-token");
  return request;
}

/** proxy 用 NextResponse.next() 表示放行，放行时不带 location。 */
function isPassThrough(response: Response): boolean {
  return response.status === 200 && response.headers.get("location") === null;
}

test("未知页面路径交给 Next 渲染 404，而不是 307 到登录页", async () => {
  const response = await proxy(anonymousRequest("/this-page-does-not-exist"));

  assert.equal(
    response.headers.get("location"),
    null,
    "不存在的页面被重定向的话，站点永远不返回 404，爬虫拿到的是 soft 404"
  );
  assert.ok(isPassThrough(response));
});

test("robots.txt 与 sitemap.xml 不被重定向", async () => {
  for (const path of ["/robots.txt", "/sitemap.xml"]) {
    const response = await proxy(anonymousRequest(path));
    assert.equal(
      response.headers.get("location"),
      null,
      `${path} 被重定向了；爬虫是匿名请求，这两个文件必须匿名可达`
    );
  }
});

test("登录后页面把匿名用户送去登录页，并带上来路", async () => {
  for (const prefix of authGatedRoutePrefixes) {
    const response = await proxy(anonymousRequest(prefix));
    const location = response.headers.get("location");

    assert.ok(location, `${prefix} 应当重定向匿名用户`);
    const redirect = new URL(location);
    assert.equal(redirect.pathname, "/signin");
    assert.equal(redirect.searchParams.get("callbackUrl"), prefix);
  }
});

test("登录后页面的子路径同样受门禁", async () => {
  const response = await proxy(anonymousRequest("/studio/admin/users"));

  assert.match(response.headers.get("location") ?? "", /\/signin/);
});

test("已登录用户可以进入登录后页面", async () => {
  for (const prefix of authGatedRoutePrefixes) {
    const response = await proxy(signedInRequest(prefix));
    assert.ok(isPassThrough(response), `${prefix} 对已登录用户应当放行`);
  }
});

test("公开页面匿名可达", async () => {
  for (const route of publicRoutes) {
    const response = await proxy(anonymousRequest(route));
    assert.ok(isPassThrough(response), `${route} 在 publicRoutes 里却被拦了`);
  }
});

test("法务页在 publicRoutes 里——注册页在无会话时就链向它们", () => {
  for (const route of ["/terms", "/privacy", "/takedown"]) {
    assert.ok(publicRoutes.includes(route), `${route} 必须匿名可达`);
  }
});

test("非公开 API 对匿名请求一律 401（安全边界仍是默认拒绝）", async () => {
  for (const path of [
    "/api/credits",
    "/api/image/tasks",
    "/api/admin/users",
    "/api/studio/sessions",
    "/api/some/route/added/later",
  ]) {
    const response = await proxy(anonymousRequest(path));
    assert.equal(response.status, 401, `${path} 对匿名请求应当 401`);
  }
});

test("放宽页面门禁没有顺带放宽 API——未知 API 路径依然 401", async () => {
  const response = await proxy(anonymousRequest("/api/definitely-not-a-route"));

  assert.equal(response.status, 401);
  assert.equal(response.headers.get("location"), null);
});

test("webhook 与探活端点匿名可达（它们有自己的鉴权）", async () => {
  for (const path of [
    "/api/callback",
    "/api/callback/kie",
    "/api/health",
    "/api/packages",
    "/api/cron/reconcile-tasks",
  ]) {
    const response = await proxy(anonymousRequest(path));
    assert.notEqual(response.status, 401, `${path} 不该被 proxy 挡住`);
  }
});

test("认证页面匿名可达", async () => {
  for (const path of ["/signin", "/signup", "/forgot-password", "/reset-password"]) {
    const response = await proxy(anonymousRequest(path));
    assert.ok(isPassThrough(response));
  }
});

test("robots 的 disallow 与 authGatedRoutePrefixes 保持一致", async () => {
  const { default: robots } = await import("../../src/app/robots");
  const rules = robots().rules;
  const rule = Array.isArray(rules) ? rules[0] : rules;
  const disallow = rule.disallow;
  const disallowed = Array.isArray(disallow) ? disallow : [disallow];

  for (const prefix of authGatedRoutePrefixes) {
    assert.ok(
      disallowed.includes(prefix),
      `${prefix} 需要登录才有内容，robots 里应当 disallow，否则索引到的是空壳`
    );
  }
});

test("sitemap 不收录会重定向的首页", async () => {
  const { default: sitemap } = await import("../../src/app/sitemap");
  const urls = sitemap().map((entry) => new URL(entry.url).pathname);

  assert.ok(
    !urls.includes("/"),
    "/ 目前是 redirect('/studio')，放进 sitemap 会被 Search Console 记为重定向错误"
  );
  assert.ok(urls.includes("/studio"));
  assert.ok(urls.includes("/terms"));
});
