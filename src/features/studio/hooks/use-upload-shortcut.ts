"use client";

import { useEffect, type RefObject } from "react";

/**
 * ⌘U / Ctrl+U 触发文件选择。附件菜单里标注了这个快捷键，
 * 由本 hook 保证它真的可用。
 */
export function useUploadShortcut(
  fileInputRef: RefObject<HTMLInputElement | null>
) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (
        (event.metaKey || event.ctrlKey) &&
        !event.shiftKey &&
        !event.altKey &&
        event.key.toLowerCase() === "u"
      ) {
        event.preventDefault();
        fileInputRef.current?.click();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [fileInputRef]);
}
