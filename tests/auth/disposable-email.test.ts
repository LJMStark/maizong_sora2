import assert from "node:assert/strict";
import test from "node:test";

import {
  extractEmailDomain,
  isDisposableEmail,
  isDisposableEmailDomain,
} from "../../src/lib/auth/disposable-email";

test("拦下量最大的几家一次性邮箱", () => {
  for (const email of [
    "a@mailinator.com",
    "b@10minutemail.com",
    "c@guerrillamail.com",
    "d@yopmail.com",
    "e@temp-mail.org",
    "f@sharklasers.com",
    "g@linshiyouxiang.net",
  ]) {
    assert.equal(isDisposableEmail(email), true, `${email} 应被拦下`);
  }
});

test("放行正常邮箱", () => {
  for (const email of [
    "a@gmail.com",
    "b@qq.com",
    "c@outlook.com",
    "d@163.com",
    "e@sora2.681023.xyz",
    "f@mycompany.co.uk",
  ]) {
    assert.equal(isDisposableEmail(email), false, `${email} 不该被拦`);
  }
});

test("子域也被覆盖", () => {
  assert.equal(isDisposableEmailDomain("inbox.mailinator.com"), true);
  assert.equal(isDisposableEmailDomain("a.b.guerrillamail.com"), true);
});

test("后缀匹配按点对齐，不误伤形近域名", () => {
  // 这是纯后缀字符串匹配最容易出的错
  assert.equal(isDisposableEmailDomain("notmailinator.com"), false);
  assert.equal(isDisposableEmailDomain("mymailinator.com"), false);
  assert.equal(isDisposableEmailDomain("temp-mail.org.mycompany.com"), false);
});

test("大小写与尾部点都归一化", () => {
  assert.equal(isDisposableEmail("A@MailInator.COM"), true);
  assert.equal(isDisposableEmail("a@mailinator.com."), true);
  assert.equal(isDisposableEmail("  a@mailinator.com  ".trim()), true);
});

test("多个 @ 时取最后一个之后的部分", () => {
  assert.equal(extractEmailDomain('"a@b"@mailinator.com'), "mailinator.com");
  assert.equal(isDisposableEmail('"a@b"@mailinator.com'), true);
});

test("畸形输入不抛异常且不误判", () => {
  for (const value of ["", "@", "a@", "@b.com", "no-at-sign", "a@localhost"]) {
    assert.equal(isDisposableEmail(value), false, `${value} 不该被判为一次性邮箱`);
  }
});

test("extractEmailDomain 对无点域名返回 null", () => {
  assert.equal(extractEmailDomain("a@localhost"), null);
  assert.equal(extractEmailDomain("a@b.com"), "b.com");
});
