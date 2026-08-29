import { videoTaskService } from "@/features/studio/services/video-task-service";
import { imageTaskService } from "@/features/studio/services/image-task-service";
import {
  creditService,
  RefundCreditsParams,
} from "@/features/studio/services/credit-service";

/**
 * 任务已进入终态后的退款：失败时不向上抛（否则回调方会重复推送、
 * 而任务已终态导致重复回调直接跳过，退款永久丢失）。
 * 漏退由 /api/cron/reconcile-tasks 对账补退。
 */
async function refundOrDefer(params: RefundCreditsParams): Promise<void> {
  try {
    await creditService.refundCredits(params);
  } catch (error) {
    console.error("[Refund] 退款失败，等待对账任务补退:", {
      userId: params.userId,
      referenceType: params.referenceType,
      referenceId: params.referenceId,
      amount: params.amount,
      error,
    });
  }
}

export interface FailVideoTaskParams {
  taskId: string;
  userId: string;
  amount: number;
  reason: string;
  sourceTransactionId?: string;
  progress?: number;
  errorMessage?: string;
}

// 将视频任务标记为错误（仅当任务仍处于活跃状态时生效），成功转换后退款
export async function failVideoTaskAndRefund(
  params: FailVideoTaskParams
): Promise<boolean> {
  const transitionedTask = await videoTaskService.transitionToErrorIfActive({
    taskId: params.taskId,
    progress: params.progress,
    errorMessage: params.errorMessage,
  });

  if (!transitionedTask) {
    return false;
  }

  await refundOrDefer({
    userId: params.userId,
    amount: params.amount,
    reason: params.reason,
    referenceType: "video_task",
    referenceId: params.taskId,
    sourceTransactionId: params.sourceTransactionId,
  });

  return true;
}

export interface FailImageTaskParams {
  taskId: string;
  userId: string;
  amount: number;
  reason: string;
  sourceTransactionId?: string;
  errorMessage?: string;
}

// 将图片任务标记为错误（仅当任务仍处于活跃状态时生效），成功转换后退款
export async function failImageTaskAndRefund(
  params: FailImageTaskParams
): Promise<boolean> {
  const transitionedTask = await imageTaskService.transitionToErrorIfActive(
    params.taskId,
    params.errorMessage
  );

  if (!transitionedTask) {
    return false;
  }

  await refundOrDefer({
    userId: params.userId,
    amount: params.amount,
    reason: params.reason,
    referenceType: "image_task",
    referenceId: params.taskId,
    sourceTransactionId: params.sourceTransactionId,
  });

  return true;
}
