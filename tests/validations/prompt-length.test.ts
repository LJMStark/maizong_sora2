import assert from "node:assert/strict";
import test from "node:test";

import {
  EditImageSchema,
  GenerateImageSchema,
  GenerateVideoSchema,
} from "../../src/lib/validations/schemas";

const makeString = (length: number) => "a".repeat(length);

test("GenerateImageSchema accepts prompt length 10000", () => {
  const result = GenerateImageSchema.safeParse({
    prompt: makeString(10000),
  });

  assert.equal(result.success, true);
});

test("GenerateImageSchema rejects prompt length 10001", () => {
  const result = GenerateImageSchema.safeParse({
    prompt: makeString(10001),
  });

  assert.equal(result.success, false);
});

test("EditImageSchema accepts prompt length 10000", () => {
  const result = EditImageSchema.safeParse({
    prompt: makeString(10000),
    imageBase64: "x",
    imageMimeType: "image/png",
  });

  assert.equal(result.success, true);
});

test("EditImageSchema rejects prompt length 10001", () => {
  const result = EditImageSchema.safeParse({
    prompt: makeString(10001),
    imageBase64: "x",
    imageMimeType: "image/png",
  });

  assert.equal(result.success, false);
});

test("GenerateVideoSchema accepts prompt length 10000", () => {
  const result = GenerateVideoSchema.safeParse({
    prompt: makeString(10000),
    duration: 10,
  });

  assert.equal(result.success, true);
});

test("GenerateVideoSchema rejects prompt length 10001", () => {
  const result = GenerateVideoSchema.safeParse({
    prompt: makeString(10001),
    duration: 10,
  });

  assert.equal(result.success, false);
});
