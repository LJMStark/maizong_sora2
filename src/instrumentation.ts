import type { Instrumentation } from "next";

/**
 * 应用启动钩子。本项目部署在 Zeabur 长驻容器里，定时任务由进程内
 * 调度器驱动（平台不提供 cron，vercel.json 也不会被读取）。
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // 构建期收集页面信息时不应启动调度器
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  // 逃生开关：多副本部署且想改用外部调度器时置为 1
  if (process.env.DISABLE_INTERNAL_SCHEDULER === "1") return;

  const { startScheduler } = await import("@/lib/scheduler");
  startScheduler();
}

/**
 * 服务端错误统一出口。目前只做结构化输出到平台日志，
 * 接入 Sentry 等外部服务时在这里补一次上报即可，
 * 不必再去改各个路由。
 *
 * 覆盖范围：Server Components、Route Handlers、Server Actions、Proxy。
 * 不覆盖浏览器端错误（那部分需要 global-error.tsx）。
 */
export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context
) => {
  // error 类型是 unknown，且可能已被 React 包装过，
  // 真实类型要靠 digest 字段辨认
  const digest =
    typeof error === "object" && error !== null && "digest" in error
      ? String((error as { digest: unknown }).digest)
      : undefined;

  console.error("[RequestError]", {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    digest,
    path: request.path,
    method: request.method,
    routeType: context.routeType,
    routePath: context.routePath,
    renderSource: context.renderSource,
  });
};
