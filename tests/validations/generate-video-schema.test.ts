import assert from "node:assert/strict";
import test from "node:test";

import { GenerateVideoSchema } from "../../src/lib/validations/schemas";

test("GenerateVideoSchema accepts duration 10", () => {
  const result = GenerateVideoSchema.safeParse({
    prompt: "test prompt",
    duration: 10,
  });

  assert.equal(result.success, true);
});

test("GenerateVideoSchema accepts duration 15", () => {
  const result = GenerateVideoSchema.safeParse({
    prompt: "test prompt",
    duration: 15,
  });

  assert.equal(result.success, true);
});

test("GenerateVideoSchema rejects unsupported duration", () => {
  const result = GenerateVideoSchema.safeParse({
    prompt: "test prompt",
    duration: 12,
  });

  assert.equal(result.success, false);
});
