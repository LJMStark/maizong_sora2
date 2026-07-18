import { VideoTaskType } from "@/db/schema";
import { failVideoTaskAndRefund } from "@/features/studio/services/task-failure";

// 资源分配错误最多重试 3 次
export const MAX_RESOURCE_RETRIES = 3;
// 生成失败错误只重试 1 次
export const MAX_GENERATION_FAILED_RETRIES = 1;

// 用户友好的错误消息
export const PROMPT_REVIEW_ERROR =
  "提示词未通过内容审核，请尝试：1) 使用更中性的描述 2) 避免敏感词汇 3) 简化复杂场景";

// 错误类型判断
export function isResourceAllocationError(message: string): boolean {
  return message?.toLowerCase().includes("resources are being allocated");
}

export function isGenerationFailedError(message: string): boolean {
  return message?.toLowerCase().includes("failed to generate");
}

export async function transitionTaskToErrorAndRefund(params: {
  task: VideoTaskType;
  progress: number;
  errorMessage: string;
  refundReason: string;
}): Promise<boolean> {
  return failVideoTaskAndRefund({
    taskId: params.task.id,
    userId: params.task.userId,
    amount: params.task.creditCost,
    reason: params.refundReason,
    sourceTransactionId: params.task.creditTransactionId ?? undefined,
    progress: params.progress,
    errorMessage: params.errorMessage,
  });
}
