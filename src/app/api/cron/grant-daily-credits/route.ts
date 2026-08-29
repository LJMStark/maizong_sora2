import { NextRequest, NextResponse } from "next/server";
import { refreshDailySubscriptionQuota } from "@/features/studio/services/subscription-quota-service";
import { sanitizeApiErrorMessage } from "@/lib/api/sanitize-error-message";

/**
 * 订阅额度刷新的手动/外部触发入口。
 * 常规调度由进程内 scheduler 负责（见 src/lib/scheduler.ts），
 * 本路由保留用于人工触发和外部调度器兜底。
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await refreshDailySubscriptionQuota();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = sanitizeApiErrorMessage(error);
    return NextResponse.json(
      { error: `刷新订阅额度失败：${message}` },
      { status: 500 }
    );
  }
}
