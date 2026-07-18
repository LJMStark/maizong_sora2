import { videoTaskService } from "@/features/studio/services/video-task-service";
import { imageTaskService } from "@/features/studio/services/image-task-service";
import { creditService } from "@/features/studio/services/credit-service";

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

  await creditService.refundCredits({
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

  await creditService.refundCredits({
    userId: params.userId,
    amount: params.amount,
    reason: params.reason,
    referenceType: "image_task",
    referenceId: params.taskId,
    sourceTransactionId: params.sourceTransactionId,
  });

  return true;
}
