import { NextRequest, NextResponse } from "next/server";
import { videoTaskService } from "@/features/studio/services/video-task-service";
import { storageService } from "@/features/studio/services/storage-service";
import { creditService } from "@/features/studio/services/credit-service";
import { duomiService } from "@/features/studio/services/duomi-service";
import { VideoTaskType } from "@/db/schema";
import crypto from "crypto";

// 资源分配错误最多重试 3 次
const MAX_RESOURCE_RETRIES = 3;
// 生成失败错误只重试 1 次
const MAX_GENERATION_FAILED_RETRIES = 1;

// 错误类型判断
function isResourceAllocationError(message: string): boolean {
  return message?.toLowerCase().includes("resources are being allocated");
}

function isGenerationFailedError(message: string): boolean {
  return message?.toLowerCase().includes("failed to generate");
}

// 用户友好的错误消息
const PROMPT_REVIEW_ERROR = "提示词未通过内容审核，请尝试：1) 使用更中性的描述 2) 避免敏感词汇 3) 简化复杂场景";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function redactSensitiveHeaders(headers: Headers): Record<string, string> {
  const result = Object.fromEntries(headers.entries());
  if (result.authorization) {
    result.authorization = "[REDACTED]";
  }
  if (result["x-duomi-signature"]) {
    result["x-duomi-signature"] = "[REDACTED]";
  }
  return result;
}

async function transitionTaskToErrorAndRefund(params: {
  task: VideoTaskType;
  progress: number;
  errorMessage: string;
  refundReason: string;
}): Promise<boolean> {
  const transitionedTask = await videoTaskService.transitionToErrorIfActive({
    taskId: params.task.id,
    progress: params.progress,
    errorMessage: params.errorMessage,
  });

  if (!transitionedTask) {
    return false;
  }

  await creditService.refundCredits({
    userId: params.task.userId,
    amount: params.task.creditCost,
    reason: params.refundReason,
    referenceType: "video_task",
    referenceId: params.task.id,
    sourceTransactionId: params.task.creditTransactionId ?? undefined,
  });

  return true;
}

// 异步重试 Duomi 任务
async function retryDuomiTask(task: VideoTaskType, errorType: "resource" | "generation"): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://sora2.681023.xyz";
  const callbackUrl = `${baseUrl}/api/callback`;

  // 资源分配错误等待更长时间（30s, 60s, 120s）
  // 生成失败错误等待较短时间（5s）
  const retryCount = task.callbackRetryCount ?? 0;
  const delayMs = errorType === "resource"
    ? 30000 * Math.pow(2, retryCount)  // 30s, 60s, 120s
    : 5000;  // 5s

  console.log(`[Callback] 等待 ${delayMs / 1000}s 后重试...`);
  await delay(delayMs);

  try {
    const duomiResponse = await duomiService.createVideoTask({
      prompt: task.prompt,
      model: task.model as "sora-2-temporary" | "sora-2-pro",
      aspectRatio: task.aspectRatio === "9:16" ? "9:16" : "16:9",
      duration: task.duration,
      imageUrl: task.sourceImageUrl ?? undefined,
      callbackUrl,
    });

    if (duomiResponse.id) {
      await videoTaskService.updateDuomiTaskId(task.id, duomiResponse.id);
      await videoTaskService.updateTaskStatus(task.id, "running", 0);
      console.log(`[Callback] 重试成功，新任务 ID: ${duomiResponse.id}`);
    } else {
      throw new Error("重试创建 Duomi 任务失败：无返回 ID");
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Callback] 重试创建任务失败:`, errorMessage);

    // 检查是否还有重试次数
    const updatedTask = await videoTaskService.getTaskById(task.id);
    const currentRetryCount = updatedTask?.callbackRetryCount ?? 0;
    const maxRetries = errorType === "resource" ? MAX_RESOURCE_RETRIES : MAX_GENERATION_FAILED_RETRIES;

    if (currentRetryCount >= maxRetries) {
      // 所有重试都失败，标记错误并退款
      const finalErrorMessage = errorType === "generation" ? PROMPT_REVIEW_ERROR : errorMessage;
      await transitionTaskToErrorAndRefund({
        task,
        progress: 0,
        errorMessage: finalErrorMessage,
        refundReason: "视频生成失败 - 退款",
      });
    }
  }
}

// 验证回调请求的签名或 token
function verifyCallback(request: NextRequest, body: string): boolean {
  const callbackSecret = process.env.DUOMI_CALLBACK_SECRET;

  // 如果没有配置 secret，使用 DUOMI_API 作为 fallback
  if (!callbackSecret) {
    const authHeader = request.headers.get("authorization");
    const expectedToken = process.env.DUOMI_API;
    if (expectedToken && authHeader === `Bearer ${expectedToken}`) {
      return true;
    }
    // 开发环境允许无验证（生产环境必须配置）
    if (process.env.NODE_ENV === "development") {
      console.warn("[Callback] No authentication configured - allowing in development mode");
      return true;
    }
    console.warn("[Callback] No valid authentication found");
    return false;
  }

  // 验证 HMAC 签名
  const signature = request.headers.get("x-duomi-signature");
  if (!signature) {
    console.warn("[Callback] Missing x-duomi-signature header");
    return false;
  }

  const expectedSignature = crypto
    .createHmac("sha256", callbackSecret)
    .update(body)
    .digest("hex");

  // 长度检查防止 timingSafeEqual 抛出异常
  if (signature.length !== expectedSignature.length) {
    console.warn("[Callback] Signature length mismatch");
    return false;
  }

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    console.warn("[Callback] Signature comparison failed");
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const bodyText = await request.text();

    // 记录回调请求详情用于调试
    console.log("[Callback] Received callback request");
    console.log(
      "[Callback] Headers:",
      JSON.stringify(redactSensitiveHeaders(request.headers))
    );
    console.log("[Callback] Body:", bodyText);

    // 验证回调请求
    if (!verifyCallback(request, bodyText)) {
      console.log("[Callback] Verification failed");
      return NextResponse.json(
        { error: "Unauthorized callback" },
        { status: 401 }
      );
    }

    const body = JSON.parse(bodyText);
    const taskId = body.task_id ?? body.id;
    const statusRaw = body.status ?? body.state;
    const progress = body.progress ?? 0;
    const videoUrl = body.video_url ?? body?.data?.videos?.[0]?.url;
    const errorMessage = body.error_message ?? body.message ?? body.error;

    if (!taskId) {
      return NextResponse.json(
        { error: "缺少 task_id 参数" },
        { status: 400 }
      );
    }

    if (!statusRaw) {
      return NextResponse.json(
        { error: "缺少 status 参数" },
        { status: 400 }
      );
    }

    const normalizedStatus = statusRaw === "failed" ? "error" : statusRaw;

    const task = await videoTaskService.getTaskByProviderTaskId(
      taskId,
      "duomi"
    );

    if (!task) {
      return NextResponse.json({ error: "任务不存在" }, { status: 404 });
    }

    if (task.status === "succeeded" || task.status === "error") {
      return NextResponse.json({ success: true });
    }

    if (normalizedStatus === "succeeded") {
      if (!videoUrl) {
        await transitionTaskToErrorAndRefund({
          task,
          progress,
          errorMessage: "回调中缺少视频 URL",
          refundReason: "视频生成失败 - 缺少视频地址",
        });

        return NextResponse.json({ success: true });
      }

      let finalVideoUrl = videoUrl;

      try {
        finalVideoUrl = await storageService.uploadVideoFromUrl(
          task.userId,
          task.id,
          videoUrl
        );
      } catch {
        // If upload fails, use the original Duomi URL
      }

      const updatedTask = await videoTaskService.updateTaskVideoUrls(
        task.id,
        videoUrl,
        finalVideoUrl
      );

      if (!updatedTask) {
        console.warn(
          `[Callback] Skip succeeded transition because task is already in error state: ${task.id}`
        );
      }
    } else if (normalizedStatus === "error") {
      const currentRetryCount = task.callbackRetryCount ?? 0;
      const rawErrorMessage = errorMessage || "";
      let terminalErrorMessage: string | null = null;

      // 根据错误类型决定重试策略
      if (isResourceAllocationError(rawErrorMessage)) {
        // 资源分配错误：最多重试 3 次，等待更长时间
        if (currentRetryCount < MAX_RESOURCE_RETRIES) {
          console.log(`[Callback] 资源分配中，开始重试 (${currentRetryCount + 1}/${MAX_RESOURCE_RETRIES})`);

          await videoTaskService.updateTaskStatus(task.id, "retrying", 0);
          await videoTaskService.incrementRetryCount(task.id, "callback");

          retryDuomiTask(task, "resource").catch((err) => {
            console.error("[Callback] 重试失败:", err);
          });

          return NextResponse.json({ success: true });
        }

        // 资源分配重试用尽
        console.log("[Callback] 资源分配重试用尽，标记为错误状态");
        terminalErrorMessage = "服务器繁忙，请稍后重试";
      } else if (isGenerationFailedError(rawErrorMessage)) {
        // 生成失败错误：只重试 1 次
        if (currentRetryCount < MAX_GENERATION_FAILED_RETRIES) {
          console.log(`[Callback] 生成失败，尝试重试 (${currentRetryCount + 1}/${MAX_GENERATION_FAILED_RETRIES})`);

          await videoTaskService.updateTaskStatus(task.id, "retrying", 0);
          await videoTaskService.incrementRetryCount(task.id, "callback");

          retryDuomiTask(task, "generation").catch((err) => {
            console.error("[Callback] 重试失败:", err);
          });

          return NextResponse.json({ success: true });
        }

        // 生成失败重试用尽，提示用户修改提示词
        console.log("[Callback] 生成失败，提示用户修改提示词");
        terminalErrorMessage = PROMPT_REVIEW_ERROR;
      } else {
        // 其他未知错误：不重试，直接失败
        console.log("[Callback] 未知错误，标记为错误状态:", rawErrorMessage);
        terminalErrorMessage = rawErrorMessage || "视频生成失败";
      }

      await transitionTaskToErrorAndRefund({
        task,
        progress: progress || 0,
        errorMessage: terminalErrorMessage || "视频生成失败",
        refundReason: "视频生成失败 - 退款",
      });
    } else if (normalizedStatus === "running" || normalizedStatus === "pending") {
      const mappedStatus = normalizedStatus === "running" ? "running" : "pending";
      await videoTaskService.updateTaskStatus(
        task.id,
        mappedStatus,
        progress || 0
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
