import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
import { creditService } from "@/features/studio/services/credit-service";
import { videoTaskService } from "@/features/studio/services/video-task-service";
import { videoLimitService } from "@/features/studio/services/video-limit-service";
import { duomiService } from "@/features/studio/services/duomi-service";
import { kieService } from "@/features/studio/services/kie-service";
import { veoService } from "@/features/studio/services/veo-service";
import { storageService } from "@/features/studio/services/storage-service";
import { rateLimiter } from "@/lib/rate-limit";
import { GenerateVideoSchema } from "@/lib/validations/schemas";
import { sanitizeError } from "@/lib/security/error-handler";
import type { VideoProvider } from "@/features/studio/services/video-task-service";

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

  const { success } = await rateLimiter.limit(userId, "videoGenerate");
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

    // 一次查询获取积分和供应商配置（带缓存）
    const generationConfig = await videoLimitService.getVideoGenerationConfig();
    const configuredProvider = generationConfig.providers.fast;

    // VEO provider 时固定模型和时长，统一归类为 fast
    const isVeo = configuredProvider === "veo";
    const model = isVeo ? "veo3.1-fast" : (mode === "Quality" ? "sora-2-pro" : "sora-2-temporary");
    const videoType: "fast" | "quality" = isVeo ? "fast" : (model === "sora-2-temporary" ? "fast" : "quality");

    const creditCost = videoType === "fast"
      ? generationConfig.creditCosts.videoFast
      : generationConfig.creditCosts.videoQuality;
    const actualProvider: "veo" | "kie" | "duomi" = isVeo ? "veo" : generationConfig.providers[videoType];

    // VEO 不检查每日限额，仅受积分限制
    if (!isVeo) {
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

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://sora2.681023.xyz";
    const resolvedAspectRatio = aspectRatio === "9:16" ? "9:16" : "16:9";
    const resolvedDuration = isVeo ? 8 : (duration || 10);

    const task = await videoTaskService.createTask({
      userId,
      model,
      prompt,
      aspectRatio: aspectRatio || "16:9",
      duration: resolvedDuration,
      sourceImageUrl,
      creditCost,
      creditTransactionId: transactionId,
      provider: actualProvider,
    });

    let lastError: Error | null = null;

    // 根据配置的供应商调用对应 API
    if (actualProvider === "veo") {
      // VEO 供应商（不需要 callback，通过前端轮询获取状态）
      for (let attempt = 0; attempt < MAX_GENERATE_RETRIES; attempt++) {
        try {
          const veoResponse = await veoService.createVideoTask({
            prompt,
            aspectRatio: resolvedAspectRatio,
            imageUrls: sourceImageUrl ? [sourceImageUrl] : undefined,
          });

          if (veoResponse.id) {
            await videoTaskService.updateDuomiTaskId(task.id, veoResponse.id);
            await videoTaskService.updateTaskStatus(task.id, "running", 0);
            lastError = null;
            break;
          } else {
            lastError = new Error("创建 VEO 任务失败：无返回 ID");
          }
        } catch (veoError) {
          lastError = veoError instanceof Error ? veoError : new Error("未知错误");
          console.log(`[Generate] VEO API 调用失败 (尝试 ${attempt + 1}/${MAX_GENERATE_RETRIES}):`, lastError.message);

          if (attempt > 0) {
            await videoTaskService.incrementRetryCount(task.id, "generate");
          }

          if (attempt < MAX_GENERATE_RETRIES - 1) {
            await delay(1000 * Math.pow(2, attempt));
          }
        }
      }
    } else if (actualProvider === "kie") {
      const kieCallbackUrl = `${baseUrl}/api/callback/kie`;

      for (let attempt = 0; attempt < MAX_GENERATE_RETRIES; attempt++) {
        try {
          const kieResponse = await kieService.createVideoTask({
            prompt,
            aspectRatio: resolvedAspectRatio,
            duration: resolvedDuration,
            imageUrl: sourceImageUrl,
            callbackUrl: kieCallbackUrl,
            progressCallbackUrl: kieCallbackUrl,
            isPro: model === "sora-2-pro",
          });

          if (kieResponse.id) {
            await videoTaskService.updateDuomiTaskId(task.id, kieResponse.id);
            await videoTaskService.updateTaskStatus(task.id, "running", 0);
            lastError = null;
            break;
          } else {
            lastError = new Error("创建 KIE AI 任务失败：无返回 ID");
          }
        } catch (kieError) {
          lastError = kieError instanceof Error ? kieError : new Error("未知错误");
          console.log(`[Generate] KIE AI API 调用失败 (尝试 ${attempt + 1}/${MAX_GENERATE_RETRIES}):`, lastError.message);

          if (attempt > 0) {
            await videoTaskService.incrementRetryCount(task.id, "generate");
          }

          if (attempt < MAX_GENERATE_RETRIES - 1) {
            await delay(1000 * Math.pow(2, attempt));
          }
        }
      }
    } else {
      // Duomi 供应商
      const duomiCallbackUrl = `${baseUrl}/api/callback`;

      for (let attempt = 0; attempt < MAX_GENERATE_RETRIES; attempt++) {
        try {
          const duomiResponse = await duomiService.createVideoTask({
            prompt,
            model: model as "sora-2-temporary" | "sora-2-pro",
            aspectRatio: resolvedAspectRatio,
            duration: resolvedDuration,
            imageUrl: sourceImageUrl,
            callbackUrl: duomiCallbackUrl,
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
            await delay(1000 * Math.pow(2, attempt));
          }
        }
      }
    }

    // 供应商调用失败
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
