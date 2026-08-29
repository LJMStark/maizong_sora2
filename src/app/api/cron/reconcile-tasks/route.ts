import { NextRequest, NextResponse } from "next/server";
import {
  advanceActivePptTasks,
  reconcileMissingRefunds,
  recoverStuckVideoTasks,
} from "@/features/studio/services/task-reconcile-service";
import { sanitizeApiErrorMessage } from "@/lib/api/sanitize-error-message";
import { delay } from "@/lib/utils";

export const maxDuration = 60;

// 单次调用内的 PPT 推进循环时长与间隔：
// 让整卷 PPT 在无浏览器轮询时也能持续推进，而不是每分钟只走一步
const PPT_ADVANCE_WINDOW_MS = 40_000;
const PPT_ADVANCE_INTERVAL_MS = 8_000;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const videoRecovery = await recoverStuckVideoTasks();
    const refunds = await reconcileMissingRefunds();

    let pptRounds = 0;
    const deadline = Date.now() + PPT_ADVANCE_WINDOW_MS;
    for (;;) {
      const activeCount = await advanceActivePptTasks();
      pptRounds += 1;
      if (activeCount === 0 || Date.now() >= deadline) break;
      await delay(PPT_ADVANCE_INTERVAL_MS);
    }

    return NextResponse.json({
      success: true,
      videoRecovery,
      refunds,
      pptRounds,
    });
  } catch (error) {
    const message = sanitizeApiErrorMessage(error);
    console.error("[Cron] reconcile-tasks 执行失败:", error);
    return NextResponse.json(
      { error: `任务对账失败：${message}` },
      { status: 500 }
    );
  }
}
