import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { Redis } from "@upstash/redis";
import { db } from "@/db";

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
  const [database, redis] = await Promise.all([checkDatabase(), checkRedis()]);

  const checks = { database, redis };
  const healthy = Object.values(checks).every((state) => state !== "fail");

  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      checks,
      timestamp: new Date().toISOString(),
    },
    {
      status: healthy ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    }
  );
}
