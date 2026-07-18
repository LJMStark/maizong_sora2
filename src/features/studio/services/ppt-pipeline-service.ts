import { PptSlideType, PptTaskType } from "@/db/schema";
import { pptTaskService } from "@/features/studio/services/ppt-task-service";
import { duomiGptImageService } from "@/features/studio/services/duomi-gpt-image-service";
import { storageService } from "@/features/studio/services/storage-service";
import { creditService } from "@/features/studio/services/credit-service";
import {
  MAX_RESOURCE_RETRIES,
  MAX_GENERATION_FAILED_RETRIES,
  PROMPT_REVIEW_ERROR,
  isResourceAllocationError,
  isGenerationFailedError,
} from "@/features/studio/services/provider-callback-shared";

// 认领后未创建 provider 任务的僵尸页回收阈值
const ZOMBIE_STALE_MS = 60 * 1000;
// 单页生成超时
const SLIDE_TIMEOUT_MS = 10 * 60 * 1000;
// provider 创建/查询瞬态错误（5xx、网络）最多重试次数
const MAX_TRANSIENT_RETRIES = 2;

interface FailurePolicy {
  retryable: boolean;
  maxRetries: number;
  friendlyMessage?: string;
}

function isTransientProviderError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    /duomi api 错误: 5\d\d/.test(lower) ||
    lower.includes("fetch failed") ||
    lower.includes("econnreset") ||
    lower.includes("etimedout") ||
    lower.includes("socket hang up")
  );
}

function classifyFailure(message: string): FailurePolicy {
  if (isResourceAllocationError(message)) {
    return { retryable: true, maxRetries: MAX_RESOURCE_RETRIES };
  }
  if (isGenerationFailedError(message)) {
    return {
      retryable: true,
      maxRetries: MAX_GENERATION_FAILED_RETRIES,
      friendlyMessage: PROMPT_REVIEW_ERROR,
    };
  }
  if (isTransientProviderError(message)) {
    return { retryable: true, maxRetries: MAX_TRANSIENT_RETRIES };
  }
  return { retryable: false, maxRetries: 0 };
}

/** 重试退避：30s → 60s → 120s（由下一次轮询按 updatedAt 判定，不阻塞请求） */
function retryBackoffMs(retryCount: number): number {
  if (retryCount <= 0) return 0;
  return Math.min(30_000 * 2 ** (retryCount - 1), 120_000);
}

function errorMessageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** 单页退款（防双退：markSlideRefundedOnce 赢家才执行） */
async function refundSlide(
  task: PptTaskType,
  slide: PptSlideType,
  reason: string
): Promise<void> {
  const won = await pptTaskService.markSlideRefundedOnce(slide.id);
  if (!won) return;

  await creditService.refundCredits({
    userId: task.userId,
    amount: task.creditCostPerPage,
    reason,
    referenceType: "ppt_slide",
    referenceId: slide.id,
    sourceTransactionId:
      slide.regenTransactionId ?? task.creditTransactionId ?? undefined,
  });
  await pptTaskService.addRefundedCredits(task.id, task.creditCostPerPage);
}

/** 已认领页（running、providerTaskId 为空）→ 创建 provider 任务 */
async function kickSlide(task: PptTaskType, slide: PptSlideType): Promise<void> {
  try {
    const response = await duomiGptImageService.createTask({
      prompt: slide.prompt,
      resolution: task.resolution,
      imageUrls:
        task.templateRefImageUrls && task.templateRefImageUrls.length > 0
          ? task.templateRefImageUrls
          : undefined,
    });
    await pptTaskService.setSlideProviderTaskId(slide.id, response.task_id);
  } catch (error) {
    await handleSlideFailure(task, slide, errorMessageOf(error));
  }
}

async function handleSlideFailure(
  task: PptTaskType,
  slide: PptSlideType,
  message: string
): Promise<void> {
  const policy = classifyFailure(message);

  if (policy.retryable && slide.retryCount < policy.maxRetries) {
    // requeue 后不立即 kick：下一次轮询按退避时间（updatedAt）重新认领
    await pptTaskService.requeueSlideIfRunning(slide.id, slide.retryCount, message);
    return;
  }

  const failed = await pptTaskService.failSlideIfRunning(
    slide.id,
    policy.friendlyMessage ?? message
  );
  if (!failed) return;

  await refundSlide(task, failed, "PPT 单页生成失败 - 退款");
  await advanceAfterSlideSettled(task.id);
}

/** 某页进入终态后的推进：样张流转 or 继续下一页 */
async function advanceAfterSlideSettled(taskId: string): Promise<void> {
  const task = await pptTaskService.getTaskById(taskId);
  if (!task) return;

  if (task.status === "generating_sample") {
    // 样张已定稿（无论成败）→ 等用户确认；不 kick 下一页
    await pptTaskService.transitionTaskIfStatus(
      task.id,
      ["generating_sample"],
      "awaiting_confirm"
    );
    return;
  }

  if (task.status !== "generating" && task.status !== "pending") return;
  await advanceQueue(task);
}

/** 认领下一待生成页并 kick；无待生成页时收尾 */
async function advanceQueue(task: PptTaskType): Promise<void> {
  const slides = await pptTaskService.getSlides(task.id);

  if (slides.some((s) => s.status === "running")) return;

  const next = slides.find((s) => s.status === "queued");
  if (!next) {
    const allSucceeded = slides.every((s) => s.status === "succeeded");
    const anySucceeded = slides.some((s) => s.status === "succeeded");
    const finalStatus = allSucceeded
      ? "succeeded"
      : anySucceeded
        ? "partial"
        : "error";
    await pptTaskService.transitionTaskIfStatus(
      task.id,
      ["pending", "generating_sample", "generating"],
      finalStatus,
      finalStatus === "error" ? { errorMessage: "全部页面生成失败" } : undefined
    );
    return;
  }

  const claimed = await pptTaskService.claimSlide(
    next.id,
    retryBackoffMs(next.retryCount)
  );
  if (!claimed) return; // 并发竞争失败，或重试退避未到

  if (task.status === "pending") {
    await pptTaskService.transitionTaskIfStatus(
      task.id,
      ["pending"],
      task.sampleFirst ? "generating_sample" : "generating"
    );
  }

  await kickSlide(task, claimed);
}

export const pptPipelineService = {
  /**
   * 流水线推进入口（status 轮询 / generate / sample confirm 共用）。
   * 每次调用至多做一步：查询在途页状态并按结果推进，或认领下一页。
   * 所有状态迁移均为条件更新，双端并发轮询安全。
   */
  async advanceTask(taskId: string): Promise<void> {
    const task = await pptTaskService.getTaskById(taskId);
    if (!task || !pptTaskService.isTaskActive(task)) return;
    if (task.status === "awaiting_confirm") return;

    const slides = await pptTaskService.getSlides(task.id);
    const running = slides.find((s) => s.status === "running");

    if (!running) {
      await advanceQueue(task);
      return;
    }

    if (!running.providerTaskId) {
      // 上一个赢家认领后崩溃：超时后重新认领并 kick
      const reclaimed = await pptTaskService.reclaimZombieSlide(
        running.id,
        ZOMBIE_STALE_MS
      );
      if (reclaimed) {
        await kickSlide(task, reclaimed);
      }
      return;
    }

    if (Date.now() - running.updatedAt.getTime() > SLIDE_TIMEOUT_MS) {
      await handleSlideFailure(task, running, "生成超时（超过 10 分钟）");
      return;
    }

    let status;
    try {
      status = await duomiGptImageService.getTaskStatus(running.providerTaskId);
    } catch {
      // 查询瞬态失败：下次轮询自然重试
      return;
    }

    if (status.state === "succeeded" && status.imageUrl) {
      let finalImageUrl = status.imageUrl;
      try {
        finalImageUrl = await storageService.uploadPptSlideFromUrl(
          task.userId,
          task.id,
          running.slideIndex,
          status.imageUrl
        );
      } catch (uploadError) {
        console.error("[PPT Pipeline] 上传幻灯片图片到存储失败:", {
          taskId: task.id,
          slideIndex: running.slideIndex,
          error: uploadError,
        });
        // 上传失败回落使用 provider 原始 URL
      }

      const won = await pptTaskService.completeSlideIfRunning(running.id, {
        duomiImageUrl: status.imageUrl,
        finalImageUrl,
      });
      if (won) {
        await advanceAfterSlideSettled(task.id);
      }
      return;
    }

    if (status.state === "error" || status.state === "succeeded") {
      // error，或 succeeded 但缺图片 URL
      await handleSlideFailure(
        task,
        running,
        status.error || "图片生成失败"
      );
    }
    // pending / running：等待下次轮询
  },

  /**
   * 取消任务：迁移终态 + 取消待生成页 + 逐页退款。
   * 已在 provider 生成中的页不退（成本已产生）。
   */
  async cancelTask(taskId: string): Promise<{
    cancelled: boolean;
    refundedAmount: number;
  }> {
    const task = await pptTaskService.transitionTaskIfStatus(
      taskId,
      ["pending", "generating_sample", "awaiting_confirm", "generating"],
      "cancelled"
    );
    if (!task) {
      return { cancelled: false, refundedAmount: 0 };
    }

    const cancelledSlides = await pptTaskService.cancelPendingSlides(taskId);
    let refundedAmount = 0;
    for (const slide of cancelledSlides) {
      const before = slide.refunded;
      await refundSlide(task, slide, "PPT 任务取消 - 未生成页退款");
      if (!before) {
        refundedAmount += task.creditCostPerPage;
      }
    }

    return { cancelled: true, refundedAmount };
  },
};
