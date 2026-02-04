import assert from "node:assert/strict";
import test from "node:test";

import { SignUpSchema } from "../../src/app/(routes)/(auth)/signup/validate";

const basePayload = {
  email: "user@example.com",
  name: "UserName",
  username: "user1234",
  password: "Aa1!aaaa",
  confirmPassword: "Aa1!aaaa",
  gender: false,
};

test("SignUpSchema accepts username length 20", () => {
  const result = SignUpSchema.safeParse({
    ...basePayload,
    username: "a".repeat(20),
  });

  assert.equal(result.success, true);
});

test("SignUpSchema rejects username length 21", () => {
  const result = SignUpSchema.safeParse({
    ...basePayload,
    username: "a".repeat(21),
  });

  assert.equal(result.success, false);
});
