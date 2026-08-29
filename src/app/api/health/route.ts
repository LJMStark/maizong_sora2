import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { Redis } from "@upstash/redis";
import { db } from "@/db";
import { getXiaoxiaodongGalleryBase } from "@/features/studio/data/xiaoxiaodong-cdn";

// 探活不缓存，且必须每次真实执行依赖检查
export const dynamic = "force-dynamic";
export const maxDuration = 15;

// 单项检查的超时：探活本身绝不能被慢依赖拖住
const CHECK_TIMEOUT_MS = 3000;

type CheckResult = "ok" | "fail" | "not_configured";

async function withTimeout<T>(promise: Promise<T>): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("检查超时")), CHECK_TIMEOUT_MS)
    ),
  ]);
}

async function checkDatabase(): Promise<CheckResult> {
  try {
    await withTimeout(db.execute(sql`select 1`));
    return "ok";
  } catch (error) {
    console.error("[Health] 数据库检查失败:", error);
    return "fail";
  }
}

/**
 * 灵感库目录是首页要用的外部依赖，坏了页面直接空白，
 * 因此纳入探活。回报上游状态码以便区分「上游 4xx」与「网络不可达」。
 */
async function checkGallery(): Promise<CheckResult | string> {
  const base = getXiaoxiaodongGalleryBase();
  if (!base) return "not_configured";

  try {
    const response = await withTimeout(
      fetch(`${base}/index.json`, {
        cache: "no-store",
        signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
      })
    );
    return response.ok ? "ok" : `fail_http_${response.status}`;
  } catch (error) {
    const name = error instanceof Error ? error.name : "Error";
    console.error("[Health] 灵感库检查失败:", { base, error });
    return `fail_${name}`;
  }
}

async function checkRedis(): Promise<CheckResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  // Redis 未配置时限流会退回单机内存，属于已知降级而非故障
  if (!url || !token) return "not_configured";

  try {
    await withTimeout(new Redis({ url, token }).ping());
    return "ok";
  } catch (error) {
    console.error("[Health] Redis 检查失败:", error);
    return "fail";
  }
}

/**
 * 健康检查：检查依赖是否真的可用，而不是只证明进程还在。
 * 任一依赖故障返回 503，供外部 uptime 监控告警。
 */
export async function GET() {
  const [database, redis, gallery] = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkGallery(),
  ]);

  const checks = { database, redis, gallery };
  // 灵感库是展示型依赖，坏了不代表服务不可用，只降级不判死
  const healthy = database !== "fail" && redis !== "fail";

  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      checks,
      // 回显构建标记，用于确认部署是否真的生效
      build: {
        builtAt: process.env.APP_BUILD_TIME ?? "unknown",
        commit: process.env.APP_COMMIT_SHA ?? "unknown",
      },
      timestamp: new Date().toISOString(),
    },
    {
      status: healthy ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    }
  );
}
