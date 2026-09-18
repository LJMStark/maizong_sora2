import assert from "node:assert/strict";
import test from "node:test";

import { sanitizeError } from "../../src/lib/security/error-handler";
import { sanitizeApiErrorMessage } from "../../src/lib/api/sanitize-error-message";
import { UserFacingError } from "../../src/lib/security/user-facing-error";

// 上游供应商真实回过的错误，原样回显会把「用哪家、哪个模型」告诉用户
const UPSTREAM_GEMINI_ERROR =
  "[GoogleGenerativeAI Error]: Error fetching from " +
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent: " +
  "[403 Forbidden] Permission denied: Consumer 'api_key=AIzaSyFAKE' has been suspended.";

test("sanitizeError 原样返回白名单错误的文案", () => {
  const error = new UserFacingError("积分不足");

  assert.equal(sanitizeError(error), "积分不足");
});

test("sanitizeError 不泄露上游供应商与模型名", () => {
  const message = sanitizeError(new Error(UPSTREAM_GEMINI_ERROR));

  assert.doesNotMatch(message, /GoogleGenerativeAI|googleapis|gemini/i);
  assert.doesNotMatch(message, /api_key|AIzaSy/i);
});

test("sanitizeError 不泄露内网地址与端口", () => {
  const message = sanitizeError(
    new Error("connect ECONNREFUSED 198.46.146.205:31453")
  );

  assert.doesNotMatch(message, /198\.46\.146\.205|31453|ECONNREFUSED/);
});

test("sanitizeError 对非 Error 输入也返回通用文案", () => {
  const message = sanitizeError({ toString: () => "supabase_admin:hunter2" });

  assert.doesNotMatch(message, /supabase_admin|hunter2/);
});

test("sanitizeError 不把子类继承来的白名单身份弄丢", () => {
  class InsufficientCreditsError extends UserFacingError {
    constructor() {
      super("积分不足");
      this.name = "InsufficientCreditsError";
    }
  }

  assert.equal(sanitizeError(new InsufficientCreditsError()), "积分不足");
});

test("sanitizeApiErrorMessage 与 sanitizeError 有同一层保证", () => {
  const message = sanitizeApiErrorMessage(new Error(UPSTREAM_GEMINI_ERROR));

  assert.doesNotMatch(message, /GoogleGenerativeAI|googleapis|gemini/i);
});

test("sanitizeApiErrorMessage 放行白名单文案，供拼接成句", () => {
  assert.equal(
    sanitizeApiErrorMessage(new UserFacingError("兑换码已失效")),
    "兑换码已失效"
  );
});

test("两个脱敏出口都不会返回空串", () => {
  assert.notEqual(sanitizeError(new Error("")), "");
  assert.notEqual(sanitizeApiErrorMessage(new Error("")), "");
});
