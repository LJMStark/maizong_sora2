"use client";

import { useEffect } from "react";

/**
 * 兜底错误边界：root layout 自身渲染失败时，段级 `error.tsx` 也挂不上，
 * 只有这里能接住。因此它必须自带 `<html>` / `<body>`，且
 * **不能依赖 layout 里的 Provider、字体变量或 i18n**——那些恰恰可能是出错的原因。
 * 所以这里用内联样式而不是 Tailwind 类名，避免连样式表都没加载上的情况。
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <html lang="zh-Hans">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          padding: 24,
          background: "#212121",
          color: "#ffffff",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif',
          textAlign: "center",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>
          服务暂时不可用
        </h1>
        <p style={{ margin: 0, maxWidth: 420, lineHeight: 1.8, color: "#cdd5e0" }}>
          我们已经记录了这次故障。请稍后重试。
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            marginTop: 8,
            border: 0,
            borderRadius: 12,
            padding: "10px 20px",
            fontSize: 15,
            fontWeight: 600,
            background: "#ffffff",
            color: "#212121",
            cursor: "pointer",
          }}
        >
          重试
        </button>
        {error.digest && (
          <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
            错误编号 {error.digest}
          </p>
        )}
      </body>
    </html>
  );
}
