import { db } from "@/db";
import {
  videoTask,
  imageTask,
  pptTask,
  pptSlide,
  creditTransaction,
  VideoTaskType,
} from "@/db/schema";
import { and, asc, eq, inArray, isNotNull, isNull, lt, or, sql } from "drizzle-orm";
import { creditService } from "@/features/studio/services/credit-service";
import { videoTaskService } from "@/features/studio/services/video-task-service";
import { pptTaskService } from "@/features/studio/services/ppt-task-service";
import { pptPipelineService } from "@/features/studio/services/ppt-pipeline-service";
import { duomiService } from "@/features/studio/services/duomi-service";
import { kieService } from "@/features/studio/services/kie-service";
import { veoService } from "@/features/studio/services/veo-service";
import { storageService } from "@/features/studio/services/storage-service";
import { failVideoTaskAndRefund } from "@/features/studio/services/task-failure";
import { getAppBaseUrl } from "@/lib/config";

/**
 * 定时对账与恢复（由 /api/cron/reconcile-tasks 驱动）：
 * 1. 漏退补退：任务已终态但退款事务缺失（状态迁移与退款非原子，进程
 *    在两步之间退出会丢退款）→ 按积分流水核对后补退。
 * 2. 卡死任务恢复：serverless 响应后被回收的后台重试、浏览器关闭后
 *    无人轮询的任务 → 服务端主动查询 provider 并推进/终态化。
 * 3. PPT 流水线服务端推进：不再完全依赖浏览器轮询驱动。
 */

// 只对账「已稳定」的记录，避开与正在进行的退款竞争
const REFUND_RECONCILE_MIN_AGE_MS = 10 * 60 * 1000;
// retrying 状态超过该时长视为后台重试已被回收
const RETRYING_STALE_MS = 10 * 60 * 1000;
// pending/running 超过该时长未更新则主动向 provider 核对
const ACTIVE_SYNC_STALE_MS = 30 * 60 * 1000;
// 尚未拿到 provider 任务 ID 的 pending 超过该时长视为创建中断
const CREATE_STALE_MS = 15 * 60 * 1000;
// 任务总时长硬上限，超过后直接失败退款
const TASK_HARD_TIMEOUT_MS = 2 * 60 * 60 * 1000;
const BATCH_LIMIT = 50;

/** 退款事务存在性核对（referenceId 精确匹配 + 扣费溯源双重证据） */
async function hasRefundTransaction(params: {
  userId: string;
  referenceType: string;
  referenceId: string;
  sourceTransactionId?: string | null;
}): Promise<boolean> {
  const evidence = [
    and(
      eq(creditTransaction.referenceType, params.referenceType),
      eq(creditTransaction.referenceId, params.referenceId)
    )!,
  ];
  if (params.sourceTransactionId) {
    evidence.push(
      sql`${creditTransaction.metadata}->>'sourceTransactionId' = ${params.sourceTransactionId}`
    );
  }

  const rows = await db
    .select({ id: creditTransaction.id })
    .from(creditTransaction)
    .where(
      and(
        eq(creditTransaction.userId, params.userId),
        eq(creditTransaction.type, "refund"),
        or(...evidence)
      )
    )
    .limit(1);
  return rows.length > 0;
}

export interface RefundReconcileStats {
  videoRefunds: number;
  imageRefunds: number;
  pptSlideRefunds: number;
}

export async function reconcileMissingRefunds(): Promise<RefundReconcileStats> {
  const cutoff = new Date(Date.now() - REFUND_RECONCILE_MIN_AGE_MS);
  const stats: RefundReconcileStats = {
    videoRefunds: 0,
    imageRefunds: 0,
    pptSlideRefunds: 0,
  };

  // ---- 视频任务：终态 error 但无退款事务 ----
  const videoMissing = await db
    .select()
    .from(videoTask)
    .where(
      and(
        eq(videoTask.status, "error"),
        isNotNull(videoTask.creditTransactionId),
        lt(videoTask.updatedAt, cutoff),
        sql`NOT EXISTS (
          SELECT 1 FROM ${creditTransaction}
          WHERE ${creditTransaction.userId} = ${videoTask.userId}
            AND ${creditTransaction.type} = 'refund'
            AND (
              (${creditTransaction.referenceType} = 'video_task'
                AND ${creditTransaction.referenceId} = ${videoTask.id})
              OR ${creditTransaction.metadata}->>'sourceTransactionId' = ${videoTask.creditTransactionId}
            )
        )`
      )
    )
    .orderBy(asc(videoTask.updatedAt))
    .limit(BATCH_LIMIT);

  for (const task of videoMissing) {
    // 双重核对，避免与并发退款竞争造成双退
    if (
      await hasRefundTransaction({
        userId: task.userId,
        referenceType: "video_task",
        referenceId: task.id,
        sourceTransactionId: task.creditTransactionId,
      })
    ) {
      continue;
    }
    await creditService.refundCredits({
      userId: task.userId,
      amount: task.creditCost,
      reason: "视频生成失败 - 对账补退",
      referenceType: "video_task",
      referenceId: task.id,
      sourceTransactionId: task.creditTransactionId ?? undefined,
    });
    stats.videoRefunds += 1;
  }

  // ---- 图片任务：终态 error 但无退款事务 ----
  const imageMissing = await db
    .select()
    .from(imageTask)
    .where(
      and(
        eq(imageTask.status, "error"),
        isNotNull(imageTask.creditTransactionId),
        lt(imageTask.updatedAt, cutoff),
        sql`NOT EXISTS (
          SELECT 1 FROM ${creditTransaction}
          WHERE ${creditTransaction.userId} = ${imageTask.userId}
            AND ${creditTransaction.type} = 'refund'
            AND (
              (${creditTransaction.referenceType} = 'image_task'
                AND ${creditTransaction.referenceId} = ${imageTask.id})
              OR ${creditTransaction.metadata}->>'sourceTransactionId' = ${imageTask.creditTransactionId}
            )
        )`
      )
    )
    .orderBy(asc(imageTask.updatedAt))
    .limit(BATCH_LIMIT);

  for (const task of imageMissing) {
    if (
      await hasRefundTransaction({
        userId: task.userId,
        referenceType: "image_task",
        referenceId: task.id,
        sourceTransactionId: task.creditTransactionId,
      })
    ) {
      continue;
    }
    await creditService.refundCredits({
      userId: task.userId,
      amount: task.creditCost,
      reason: "图片生成失败 - 对账补退",
      referenceType: "image_task",
      referenceId: task.id,
      sourceTransactionId: task.creditTransactionId ?? undefined,
    });
    stats.imageRefunds += 1;
  }

  // ---- PPT 单页 ----
  // 情形 A：refunded=true 但退款事务缺失（先标记后退款，两步之间进程退出）
  // 情形 B：error/cancelled 且 refunded=false（失败/取消后、标记前进程退出）
  const slideCandidates = await db
    .select({
      slide: pptSlide,
      creditCostPerPage: pptTask.creditCostPerPage,
      creditTransactionId: pptTask.creditTransactionId,
    })
    .from(pptSlide)
    .innerJoin(pptTask, eq(pptSlide.taskId, pptTask.id))
    .where(
      and(
        lt(pptSlide.updatedAt, cutoff),
        sql`(
          (${pptSlide.refunded} = true)
          OR (${pptSlide.status} IN ('error', 'cancelled') AND ${pptSlide.refunded} = false)
        )`,
        sql`NOT EXISTS (
          SELECT 1 FROM ${creditTransaction}
          WHERE ${creditTransaction.userId} = ${pptSlide.userId}
            AND ${creditTransaction.type} = 'refund'
            AND ${creditTransaction.referenceType} = 'ppt_slide'
            AND ${creditTransaction.referenceId} = ${pptSlide.id}
        )`
      )
    )
    .orderBy(asc(pptSlide.updatedAt))
    .limit(BATCH_LIMIT);

  for (const { slide, creditCostPerPage, creditTransactionId } of slideCandidates) {
    if (!slide.refunded) {
      // 情形 B：沿用防双退守卫，抢标记失败说明有并发方在处理
      const won = await pptTaskService.markSlideRefundedOnce(slide.id);
      if (!won) continue;
    }
    if (
      await hasRefundTransaction({
        userId: slide.userId,
        referenceType: "ppt_slide",
        referenceId: slide.id,
      })
    ) {
      continue;
    }
    await creditService.refundCredits({
      userId: slide.userId,
      amount: creditCostPerPage,
      reason: "PPT 单页生成失败 - 对账补退",
      referenceType: "ppt_slide",
      referenceId: slide.id,
      sourceTransactionId:
        slide.regenTransactionId ?? creditTransactionId ?? undefined,
    });
    await pptTaskService.addRefundedCredits(slide.taskId, creditCostPerPage);
    stats.pptSlideRefunds += 1;
  }

  return stats;
}

export interface VideoRecoveryStats {
  retriedTasks: number;
  syncedTasks: number;
  failedTasks: number;
}

function getProviderStatusFetcher(provider: string | null) {
  switch (provider) {
    case "kie":
      return kieService.getVideoTaskStatus.bind(kieService);
    case "veo":
      return veoService.getVideoTaskStatus.bind(veoService);
    default:
      return duomiService.getVideoTaskStatus.bind(duomiService);
  }
}

async function failStuckTask(
  task: VideoTaskType,
  errorMessage: string,
  stats: VideoRecoveryStats
): Promise<void> {
  const failed = await failVideoTaskAndRefund({
    taskId: task.id,
    userId: task.userId,
    amount: task.creditCost,
    reason: "视频生成失败 - 退款",
    sourceTransactionId: task.creditTransactionId ?? undefined,
    progress: task.progress,
    errorMessage,
  });
  if (failed) {
    stats.failedTasks += 1;
  }
}

/** 与 provider 核对单个在途任务并推进到对应状态 */
async function syncTaskWithProvider(
  task: VideoTaskType,
  stats: VideoRecoveryStats
): Promise<void> {
  if (!task.duomiTaskId) return;

  let providerStatus;
  try {
    providerStatus = await getProviderStatusFetcher(task.provider)(
      task.duomiTaskId
    );
  } catch (error) {
    console.error("[Reconcile] 查询 provider 状态失败:", {
      taskId: task.id,
      error,
    });
    return;
  }

  const providerVideoUrl = providerStatus.data?.videos?.[0]?.url;

  if (providerStatus.state === "succeeded") {
    if (!providerVideoUrl) {
      await failStuckTask(task, "状态中缺少视频 URL", stats);
      return;
    }
    let finalVideoUrl = providerVideoUrl;
    try {
      finalVideoUrl = await storageService.uploadVideoFromUrl(
        task.userId,
        task.id,
        providerVideoUrl
      );
    } catch (uploadError) {
      console.error("[Reconcile] 上传视频到存储失败:", {
        taskId: task.id,
        error: uploadError,
      });
    }
    await videoTaskService.updateTaskVideoUrls(
      task.id,
      providerVideoUrl,
      finalVideoUrl
    );
    stats.syncedTasks += 1;
    return;
  }

  if (providerStatus.state === "error") {
    await failStuckTask(
      task,
      providerStatus.message || providerStatus.error || "视频生成失败",
      stats
    );
    return;
  }

  // pending / running：超过硬上限直接失败退款，否则仅刷新时间戳等下一轮
  if (Date.now() - task.createdAt.getTime() > TASK_HARD_TIMEOUT_MS) {
    await failStuckTask(task, "生成超时（超过 2 小时）", stats);
    return;
  }

  const mappedStatus = providerStatus.state === "running" ? "running" : "pending";
  const progress =
    typeof providerStatus.progress === "number"
      ? providerStatus.progress
      : task.progress;
  await videoTaskService.updateTaskStatus(task.id, mappedStatus, progress);
  stats.syncedTasks += 1;
}

export async function recoverStuckVideoTasks(): Promise<VideoRecoveryStats> {
  const now = Date.now();
  const stats: VideoRecoveryStats = {
    retriedTasks: 0,
    syncedTasks: 0,
    failedTasks: 0,
  };

  // 1) retrying 卡死：后台重试 Promise 在响应返回后被平台回收
  const stuckRetrying = await db
    .select()
    .from(videoTask)
    .where(
      and(
        eq(videoTask.status, "retrying"),
        lt(videoTask.updatedAt, new Date(now - RETRYING_STALE_MS))
      )
    )
    .orderBy(asc(videoTask.updatedAt))
    .limit(20);

  for (const task of stuckRetrying) {
    try {
      let providerTaskId: string | undefined;
      if (task.provider === "duomi") {
        const response = await duomiService.createVideoTask({
          prompt: task.prompt,
          model: task.model as "sora-2-temporary" | "sora-2-pro",
          aspectRatio: task.aspectRatio === "9:16" ? "9:16" : "16:9",
          duration: task.duration,
          imageUrl: task.sourceImageUrl ?? undefined,
          callbackUrl: `${getAppBaseUrl()}/api/callback`,
        });
        providerTaskId = response.id;
      } else if (task.provider === "kie") {
        const callbackUrl = `${getAppBaseUrl()}/api/callback/kie`;
        const response = await kieService.createVideoTask({
          prompt: task.prompt,
          aspectRatio: task.aspectRatio === "9:16" ? "9:16" : "16:9",
          duration: task.duration,
          imageUrl: task.sourceImageUrl ?? undefined,
          callbackUrl,
          progressCallbackUrl: callbackUrl,
          isPro: task.model === "sora-2-pro",
        });
        providerTaskId = response.id;
      }

      if (providerTaskId) {
        await videoTaskService.updateDuomiTaskId(task.id, providerTaskId);
        await videoTaskService.updateTaskStatus(task.id, "running", 0);
        stats.retriedTasks += 1;
        continue;
      }
    } catch (error) {
      console.error("[Reconcile] 恢复 retrying 任务失败:", {
        taskId: task.id,
        error,
      });
    }
    await failStuckTask(task, "重试中断，任务恢复失败", stats);
  }

  // 2) 有 provider 任务 ID 但长时间无更新：服务端主动核对
  const staleActive = await db
    .select()
    .from(videoTask)
    .where(
      and(
        inArray(videoTask.status, ["pending", "running"]),
        isNotNull(videoTask.duomiTaskId),
        lt(videoTask.updatedAt, new Date(now - ACTIVE_SYNC_STALE_MS))
      )
    )
    .orderBy(asc(videoTask.updatedAt))
    .limit(20);

  for (const task of staleActive) {
    await syncTaskWithProvider(task, stats);
  }

  // 3) provider 任务从未创建成功：创建流程中断
  const staleCreating = await db
    .select()
    .from(videoTask)
    .where(
      and(
        eq(videoTask.status, "pending"),
        isNull(videoTask.duomiTaskId),
        lt(videoTask.updatedAt, new Date(now - CREATE_STALE_MS))
      )
    )
    .orderBy(asc(videoTask.updatedAt))
    .limit(20);

  for (const task of staleCreating) {
    await failStuckTask(task, "任务创建中断", stats);
  }

  return stats;
}

/** 推进所有活跃 PPT 任务一步（awaiting_confirm 由 advanceTask 内部跳过） */
export async function advanceActivePptTasks(): Promise<number> {
  const tasks = await db
    .select({ id: pptTask.id })
    .from(pptTask)
    .where(
      inArray(pptTask.status, ["pending", "generating_sample", "generating"])
    )
    .orderBy(asc(pptTask.updatedAt))
    .limit(20);

  for (const task of tasks) {
    try {
      await pptPipelineService.advanceTask(task.id);
    } catch (error) {
      console.error("[Reconcile] 推进 PPT 任务失败:", {
        taskId: task.id,
        error,
      });
    }
  }

  return tasks.length;
}
