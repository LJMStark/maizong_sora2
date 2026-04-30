import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("zh-CN studio messages expose shared asset picker namespace", async () => {
  const messagesPath = new URL(
    "../src/i18n/locales/zh-CN/studio.json",
    import.meta.url
  );
  const messages = JSON.parse(await readFile(messagesPath, "utf8"));

  assert.deepEqual(messages.assetPicker, {
    title: "资源库",
    subtitle: "从生成的历史内容中选择",
    empty: "未找到有效的历史资源",
  });
});

test("copyTextToClipboard falls back when Clipboard API permission is denied", async () => {
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
  let copied = false;
  let appendedValue: string | null = null;

  const textarea = {
    value: "",
    style: {} as Record<string, string>,
    setAttribute() {},
    focus() {},
    select() {},
  };

  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      clipboard: {
        writeText: async () => {
          throw new DOMException("Write permission denied.", "NotAllowedError");
        },
      },
    },
  });

  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      body: {
        appendChild(element: typeof textarea) {
          appendedValue = element.value;
        },
        removeChild() {},
      },
      createElement(tagName: string) {
        assert.equal(tagName, "textarea");
        return textarea;
      },
      execCommand(command: string) {
        assert.equal(command, "copy");
        copied = true;
        return true;
      },
    },
  });

  try {
    const { copyTextToClipboard } = await import("../src/lib/clipboard");

    await copyTextToClipboard("DUOMI-TEST");

    assert.equal(appendedValue, "DUOMI-TEST");
    assert.equal(copied, true);
  } finally {
    if (originalNavigator) {
      Object.defineProperty(globalThis, "navigator", originalNavigator);
    } else {
      Reflect.deleteProperty(globalThis, "navigator");
    }

    if (originalDocument) {
      Object.defineProperty(globalThis, "document", originalDocument);
    } else {
      Reflect.deleteProperty(globalThis, "document");
    }
  }
});
