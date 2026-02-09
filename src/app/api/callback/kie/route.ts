import { NextRequest, NextResponse } from "next/server";
import { videoTaskService } from "@/features/studio/services/video-task-service";
import { storageService } from "@/features/studio/services/storage-service";
import { creditService } from "@/features/studio/services/credit-service";
import { kieService } from "@/features/studio/services/kie-service";
import { VideoTaskType } from "@/db/schema";

const MAX_RESOURCE_RETRIES = 3;
const MAX_GENERATION_FAILED_RETRIES = 1;

function isResourceAllocationError(message: string): boolean {
  return message?.toLowerCase().includes("resources are being allocated");
}

function isGenerationFailedError(message: string): boolean {
  return message?.toLowerCase().includes("failed to generate");
}

const PROMPT_REVIEW_ERROR =
  "提示词未通过内容审核，请尝试：1) 使用更中性的描述 2) 避免敏感词汇 3) 简化复杂场景";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function retryKieTask(
  task: VideoTaskType,
  errorType: "resource" | "generation"
): Promise<void> {
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || "https://sora2.681023.xyz";
  const callbackUrl = `${baseUrl}/api/callback/kie`;

  const retryCount = task.callbackRetryCount ?? 0;
  const delayMs =
    errorType === "resource" ? 30000 * Math.pow(2, retryCount) : 5000;

  console.log(`[KIE Callback] 等待 ${delayMs / 1000}s 后重试...`);
  await delay(delayMs);

  try {
    const kieResponse = await kieService.createVideoTask({
      prompt: task.prompt,
      aspectRatio: task.aspectRatio === "9:16" ? "9:16" : "16:9",
      duration: task.duration,
      imageUrl: task.sourceImageUrl ?? undefined,
      callbackUrl,
      progressCallbackUrl: callbackUrl,
    });

    if (kieResponse.id) {
      await videoTaskService.updateDuomiTaskId(task.id, kieResponse.id);
      await videoTaskService.updateTaskStatus(task.id, "running", 0);
      console.log(
        `[KIE Callback] 重试成功，新任务 ID: ${kieResponse.id}`
      );
    } else {
      throw new Error("重试创建 KIE AI 任务失败：无返回 ID");
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "未知错误";
    console.error(`[KIE Callback] 重试创建任务失败:`, errorMessage);

    const updatedTask = await videoTaskService.getTaskById(task.id);
    const currentRetryCount = updatedTask?.callbackRetryCount ?? 0;
    const maxRetries =
      errorType === "resource"
        ? MAX_RESOURCE_RETRIES
        : MAX_GENERATION_FAILED_RETRIES;

    if (currentRetryCount >= maxRetries) {
      const finalErrorMessage =
        errorType === "generation" ? PROMPT_REVIEW_ERROR : errorMessage;
      await videoTaskService.updateTaskStatus(
        task.id,
        "error",
        0,
        finalErrorMessage
      );
      await creditService.refundCredits({
        userId: task.userId,
        amount: task.creditCost,
        reason: "Video generation failed - refund",
        referenceType: "video_task",
        referenceId: task.id,
      });
    }
  }
}

function verifyKieCallback(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const expectedToken = process.env.KIE_AI_API_KEY;

  if (expectedToken && authHeader === `Bearer ${expectedToken}`) {
    return true;
  }

  if (process.env.NODE_ENV === "development") {
    console.warn(
      "[KIE Callback] No authentication configured - allowing in development mode"
    );
    return true;
  }

  console.warn("[KIE Callback] No valid authentication found");
  return false;
}

// KIE AI 回调 payload 格式映射
function normalizeKieStatus(
  state: string
): "pending" | "running" | "succeeded" | "error" {
  switch (state) {
    case "success":
      return "succeeded";
    case "fail":
    case "failed":
      return "error";
    case "generating":
    case "running":
      return "running";
    case "waiting":
    case "queuing":
    case "pending":
      return "pending";
    default:
      return "pending";
  }
}

function extractVideoUrl(body: Record<string, unknown>): string | undefined {
  // 尝试多种可能的 KIE 回调格式
  if (typeof body.video_url === "string") return body.video_url;

  const data = body.data as Record<string, unknown> | undefined;
  if (data) {
    if (typeof data.video_url === "string") return data.video_url;

    if (typeof data.resultJson === "string") {
      try {
        const parsed = JSON.parse(data.resultJson);
        if (Array.isArray(parsed.resultUrls) && parsed.resultUrls.length > 0) {
          return parsed.resultUrls[0];
        }
      } catch {
        // ignore parse error
      }
    }

    if (typeof data.resultJson === "object" && data.resultJson !== null) {
      const resultJson = data.resultJson as Record<string, unknown>;
      if (
        Array.isArray(resultJson.resultUrls) &&
        resultJson.resultUrls.length > 0
      ) {
        return resultJson.resultUrls[0] as string;
      }
    }

    const videos = data.videos as { url: string }[] | undefined;
    if (Array.isArray(videos) && videos.length > 0) {
      return videos[0].url;
    }
  }

  return undefined;
}

export async function POST(request: NextRequest) {
  try {
    const bodyText = await request.text();

    console.log("[KIE Callback] Received callback request");
    console.log("[KIE Callback] Body:", bodyText);

    if (!verifyKieCallback(request)) {
      console.log("[KIE Callback] Verification failed");
      return NextResponse.json(
        { error: "Unauthorized callback" },
        { status: 401 }
      );
    }

    const body = JSON.parse(bodyText);

    // KIE 回调格式: taskId 可能在 body.taskId 或 body.data.taskId
    const taskId =
      body.taskId ??
      body.task_id ??
      (body.data as Record<string, unknown> | undefined)?.taskId;
    const statusRaw =
      body.state ??
      body.status ??
      (body.data as Record<string, unknown> | undefined)?.state;
    const progress =
      body.progress ??
      (body.data as Record<string, unknown> | undefined)?.progress ??
      0;
    const errorMessage =
      body.failMsg ??
      body.error_message ??
      body.message ??
      body.error ??
      (body.data as Record<string, unknown> | undefined)?.failMsg;

    if (!taskId) {
      return NextResponse.json(
        { error: "缺少 taskId 参数" },
        { status: 400 }
      );
    }

    if (!statusRaw) {
      return NextResponse.json(
        { error: "缺少 status 参数" },
        { status: 400 }
      );
    }

    const normalizedStatus = normalizeKieStatus(statusRaw as string);

    // 通过 provider 过滤查找任务
    const task = await videoTaskService.getTaskByProviderTaskId(
      taskId as string,
      "kie"
    );

    // 兜底: 尝试不带 provider 查找 (兼容旧数据)
    const resolvedTask =
      task ?? (await videoTaskService.getTaskByDuomiId(taskId as string));

    if (!resolvedTask) {
      return NextResponse.json({ error: "任务不存在" }, { status: 404 });
    }

    if (
      resolvedTask.status === "succeeded" ||
      resolvedTask.status === "error"
    ) {
      return NextResponse.json({ success: true });
    }

    if (normalizedStatus === "succeeded") {
      const videoUrl = extractVideoUrl(body);

      if (!videoUrl) {
        await videoTaskService.updateTaskStatus(
          resolvedTask.id,
          "error",
          progress as number,
          "回调中缺少视频 URL"
        );
        await creditService.refundCredits({
          userId: resolvedTask.userId,
          amount: resolvedTask.creditCost,
          reason: "Video generation failed - missing video URL",
          referenceType: "video_task",
          referenceId: resolvedTask.id,
        });
        return NextResponse.json({ success: true });
      }

      let finalVideoUrl = videoUrl;
      try {
        finalVideoUrl = await storageService.uploadVideoFromUrl(
          resolvedTask.userId,
          resolvedTask.id,
          videoUrl
        );
      } catch {
        // If upload fails, use the original KIE URL
      }

      await videoTaskService.updateTaskVideoUrls(
        resolvedTask.id,
        videoUrl,
        finalVideoUrl
      );
    } else if (normalizedStatus === "error") {
      const currentRetryCount = resolvedTask.callbackRetryCount ?? 0;
      const rawErrorMessage = (errorMessage as string) || "";

      if (isResourceAllocationError(rawErrorMessage)) {
        if (currentRetryCount < MAX_RESOURCE_RETRIES) {
          console.log(
            `[KIE Callback] 资源分配中，开始重试 (${currentRetryCount + 1}/${MAX_RESOURCE_RETRIES})`
          );
          await videoTaskService.updateTaskStatus(
            resolvedTask.id,
            "retrying",
            0
          );
          await videoTaskService.incrementRetryCount(
            resolvedTask.id,
            "callback"
          );
          retryKieTask(resolvedTask, "resource").catch((err) => {
            console.error("[KIE Callback] 重试失败:", err);
          });
          return NextResponse.json({ success: true });
        }

        console.log("[KIE Callback] 资源分配重试用尽，标记为错误状态");
        await videoTaskService.updateTaskStatus(
          resolvedTask.id,
          "error",
          (progress as number) || 0,
          "服务器繁忙，请稍后重试"
        );
      } else if (isGenerationFailedError(rawErrorMessage)) {
        if (currentRetryCount < MAX_GENERATION_FAILED_RETRIES) {
          console.log(
            `[KIE Callback] 生成失败，尝试重试 (${currentRetryCount + 1}/${MAX_GENERATION_FAILED_RETRIES})`
          );
          await videoTaskService.updateTaskStatus(
            resolvedTask.id,
            "retrying",
            0
          );
          await videoTaskService.incrementRetryCount(
            resolvedTask.id,
            "callback"
          );
          retryKieTask(resolvedTask, "generation").catch((err) => {
            console.error("[KIE Callback] 重试失败:", err);
          });
          return NextResponse.json({ success: true });
        }

        console.log("[KIE Callback] 生成失败，提示用户修改提示词");
        await videoTaskService.updateTaskStatus(
          resolvedTask.id,
          "error",
          (progress as number) || 0,
          PROMPT_REVIEW_ERROR
        );
      } else {
        console.log(
          "[KIE Callback] 未知错误，标记为错误状态:",
          rawErrorMessage
        );
        await videoTaskService.updateTaskStatus(
          resolvedTask.id,
          "error",
          (progress as number) || 0,
          rawErrorMessage || "视频生成失败"
        );
      }

      await creditService.refundCredits({
        userId: resolvedTask.userId,
        amount: resolvedTask.creditCost,
        reason: "Video generation failed - refund",
        referenceType: "video_task",
        referenceId: resolvedTask.id,
      });
    } else if (
      normalizedStatus === "running" ||
      normalizedStatus === "pending"
    ) {
      await videoTaskService.updateTaskStatus(
        resolvedTask.id,
        normalizedStatus,
        (progress as number) || 0
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
