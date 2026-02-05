import { NextRequest, NextResponse } from "next/server";
import { videoTaskService } from "@/features/studio/services/video-task-service";
import { storageService } from "@/features/studio/services/storage-service";
import { creditService } from "@/features/studio/services/credit-service";
import { duomiService } from "@/features/studio/services/duomi-service";
import { VideoTaskType } from "@/db/schema";
import crypto from "crypto";

const MAX_CALLBACK_RETRIES = 3;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 异步重试 Duomi 任务
async function retryDuomiTask(task: VideoTaskType): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://sora2.681023.xyz";
  const callbackUrl = `${baseUrl}/api/callback`;

  // 等待一段时间后重试（指数退避）
  const retryCount = task.callbackRetryCount ?? 0;
  await delay(1000 * Math.pow(2, retryCount));

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
    const errorMessage = error instanceof Error ? error.message : "未知错误";
    console.error(`[Callback] 重试创建任务失败:`, errorMessage);

    // 检查是否还有重试次数
    const updatedTask = await videoTaskService.getTaskById(task.id);
    const currentRetryCount = updatedTask?.callbackRetryCount ?? 0;

    if (currentRetryCount >= MAX_CALLBACK_RETRIES) {
      // 所有重试都失败，标记错误并退款
      await videoTaskService.updateTaskStatus(task.id, "error", 0, errorMessage);
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
    return false;
  }

  // 验证 HMAC 签名
  const signature = request.headers.get("x-duomi-signature");
  if (!signature) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac("sha256", callbackSecret)
    .update(body)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

export async function POST(request: NextRequest) {
  try {
    const bodyText = await request.text();

    // 记录回调请求详情用于调试
    console.log("[Callback] Received callback request");
    console.log("[Callback] Headers:", JSON.stringify(Object.fromEntries(request.headers.entries())));
    console.log("[Callback] Body:", bodyText);

    // 暂时跳过验证，先确认 Duomi 回调格式
    // TODO: 确认 Duomi 回调格式后恢复验证
    // if (!verifyCallback(request, bodyText)) {
    //   console.log("[Callback] Verification failed");
    //   return NextResponse.json(
    //     { error: "Unauthorized callback" },
    //     { status: 401 }
    //   );
    // }

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

    const task = await videoTaskService.getTaskByDuomiId(taskId);

    if (!task) {
      return NextResponse.json({ error: "任务不存在" }, { status: 404 });
    }

    if (task.status === "succeeded" || task.status === "error") {
      return NextResponse.json({ success: true });
    }

    if (normalizedStatus === "succeeded") {
      if (!videoUrl) {
        await videoTaskService.updateTaskStatus(
          task.id,
          "error",
          progress,
          "回调中缺少视频 URL"
        );
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

      await videoTaskService.updateTaskVideoUrls(
        task.id,
        videoUrl,
        finalVideoUrl
      );
    } else if (normalizedStatus === "error") {
      // 检查是否可以重试
      const currentRetryCount = task.callbackRetryCount ?? 0;

      if (currentRetryCount < MAX_CALLBACK_RETRIES) {
        console.log(`[Callback] 任务失败，开始重试 (${currentRetryCount + 1}/${MAX_CALLBACK_RETRIES})`);

        // 更新状态为 retrying
        await videoTaskService.updateTaskStatus(task.id, "retrying", 0);
        await videoTaskService.incrementRetryCount(task.id, "callback");

        // 异步重新调用 Duomi API
        retryDuomiTask(task).catch((err) => {
          console.error("[Callback] 重试失败:", err);
        });

        return NextResponse.json({ success: true });
      }

      // 所有重试都失败，标记最终错误并退款
      console.log("[Callback] 所有重试都失败，标记为错误状态");
      await videoTaskService.updateTaskStatus(
        task.id,
        "error",
        progress || 0,
        errorMessage || "视频生成失败"
      );

      await creditService.refundCredits({
        userId: task.userId,
        amount: task.creditCost,
        reason: "Video generation failed - refund",
        referenceType: "video_task",
        referenceId: task.id,
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
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
