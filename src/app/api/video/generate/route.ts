import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
import { creditService } from "@/features/studio/services/credit-service";
import { videoTaskService } from "@/features/studio/services/video-task-service";
import { videoLimitService } from "@/features/studio/services/video-limit-service";
import { duomiService } from "@/features/studio/services/duomi-service";
import { storageService } from "@/features/studio/services/storage-service";
import { rateLimiter } from "@/lib/rate-limit";
import { GenerateVideoSchema } from "@/lib/validations/schemas";
import { sanitizeError } from "@/lib/security/error-handler";

const CREDIT_COSTS = {
  "sora-2-temporary": 30,
  "sora-2-pro": 100,
} as const;

const MAX_GENERATE_RETRIES = 3;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: NextRequest) {
  const session = await getServerSession();

  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  const userId = session.user.id;

  const { success } = await rateLimiter.limit(userId);
  if (!success) {
    return NextResponse.json({ error: "请求过于频繁，请稍后重试" }, { status: 429 });
  }

  try {
    const body = await request.json();

    const validation = GenerateVideoSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });
    }
    const { prompt, mode, aspectRatio, duration, imageBase64, imageMimeType } = validation.data;

    const model = mode === "Quality" ? "sora-2-pro" : "sora-2-temporary";
    const creditCost = CREDIT_COSTS[model];

    // 检查每日生成限制
    const videoType = model === "sora-2-temporary" ? "fast" : "quality";
    const limitCheck = await videoLimitService.checkLimit(userId, videoType);

    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          error: limitCheck.reason,
          errorCode: "DAILY_LIMIT_EXCEEDED",
          used: limitCheck.used,
          limit: limitCheck.limit,
        },
        { status: 429 }
      );
    }

    const currentCredits = await creditService.getUserCredits(userId);
    if (currentCredits < creditCost) {
      return NextResponse.json(
        { error: "积分不足", required: creditCost, current: currentCredits },
        { status: 400 }
      );
    }

    let sourceImageUrl: string | undefined;
    if (imageBase64 && imageMimeType) {
      const imageBuffer = Buffer.from(imageBase64, "base64");
      const filename = `source-${Date.now()}.${imageMimeType.split("/")[1] || "png"}`;
      sourceImageUrl = await storageService.uploadImage(
        userId,
        imageBuffer,
        filename,
        imageMimeType
      );
    }

    const { transactionId } = await creditService.deductCredits({
      userId,
      amount: creditCost,
      reason: `Video Generation (${mode} Mode)`,
      referenceType: "video_task",
    });

    const task = await videoTaskService.createTask({
      userId,
      model,
      prompt,
      aspectRatio: aspectRatio || "16:9",
      duration: duration || 10,
      sourceImageUrl,
      creditCost,
      creditTransactionId: transactionId,
    });

    // 同时使用回调和轮询模式
    // 回调 URL 用于 Duomi 主动通知完成状态
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://sora2.681023.xyz";
    const callbackUrl = `${baseUrl}/api/callback`;

    // 同步重试逻辑：最多重试 MAX_GENERATE_RETRIES 次
    let lastError: Error | null = null;
    for (let attempt = 0; attempt < MAX_GENERATE_RETRIES; attempt++) {
      try {
        const duomiResponse = await duomiService.createVideoTask({
          prompt,
          model,
          aspectRatio: aspectRatio === "9:16" ? "9:16" : "16:9",
          duration: duration || 10,
          imageUrl: sourceImageUrl,
          callbackUrl,
        });

        if (duomiResponse.id) {
          await videoTaskService.updateDuomiTaskId(task.id, duomiResponse.id);
          await videoTaskService.updateTaskStatus(task.id, "running", 0);
          lastError = null;
          break;
        } else {
          lastError = new Error("创建 Duomi 任务失败：无返回 ID");
        }
      } catch (duomiError) {
        lastError = duomiError instanceof Error ? duomiError : new Error("未知错误");
        console.log(`[Generate] Duomi API 调用失败 (尝试 ${attempt + 1}/${MAX_GENERATE_RETRIES}):`, lastError.message);

        if (attempt > 0) {
          await videoTaskService.incrementRetryCount(task.id, "generate");
        }

        if (attempt < MAX_GENERATE_RETRIES - 1) {
          // 指数退避：1s, 2s, 4s
          await delay(1000 * Math.pow(2, attempt));
        }
      }
    }

    // 所有重试都失败
    if (lastError) {
      await videoTaskService.updateTaskStatus(task.id, "error", 0, lastError.message);
      await creditService.refundCredits({
        userId,
        amount: creditCost,
        reason: "Video generation failed - refund",
        referenceType: "video_task",
        referenceId: task.id,
      });
    }

    return NextResponse.json({
      success: true,
      taskId: task.id,
      creditCost,
    });
  } catch (error) {
    const message = sanitizeError(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
