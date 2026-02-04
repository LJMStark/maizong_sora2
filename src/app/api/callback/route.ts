import { NextRequest, NextResponse } from "next/server";
import { videoTaskService } from "@/features/studio/services/video-task-service";
import { storageService } from "@/features/studio/services/storage-service";
import { creditService } from "@/features/studio/services/credit-service";
import crypto from "crypto";

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

    // 验证回调来源
    if (!verifyCallback(request, bodyText)) {
      return NextResponse.json(
        { error: "Unauthorized callback" },
        { status: 401 }
      );
    }

    const body = JSON.parse(bodyText);
    const { task_id, status, progress, video_url, error_message } = body;

    if (!task_id) {
      return NextResponse.json(
        { error: "task_id is required" },
        { status: 400 }
      );
    }

    const task = await videoTaskService.getTaskByDuomiId(task_id);

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (status === "succeeded" && video_url) {
      let finalVideoUrl = video_url;

      try {
        finalVideoUrl = await storageService.uploadVideoFromUrl(
          task.userId,
          task.id,
          video_url
        );
      } catch {
        // If upload fails, use the original Duomi URL
      }

      await videoTaskService.updateTaskVideoUrls(
        task.id,
        video_url,
        finalVideoUrl
      );
    } else if (status === "failed") {
      await videoTaskService.updateTaskStatus(
        task.id,
        "error",
        progress || 0,
        error_message || "Video generation failed"
      );

      await creditService.refundCredits({
        userId: task.userId,
        amount: task.creditCost,
        reason: "Video generation failed - refund",
        referenceType: "video_task",
        referenceId: task.id,
      });
    } else if (status === "running" || status === "pending") {
      const mappedStatus = status === "running" ? "running" : "pending";
      await videoTaskService.updateTaskStatus(
        task.id,
        mappedStatus,
        progress || 0
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
