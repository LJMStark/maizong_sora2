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
import { ensureUserActive } from "@/lib/auth/ensure-active-user";
import type { VideoProvider } from "@/features/studio/services/video-task-service";

const MAX_GENERATE_RETRIES = 3;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const PROVIDER_LABELS: Record<VideoProvider, string> = {
  veo: "VEO",
  kie: "KIE AI",
  duomi: "Duomi",
};

async function callProviderWithRetry(params: {
  taskId: string;
  provider: VideoProvider;
  callProvider: () => Promise<{ id: string }>;
}): Promise<Error | null> {
  const { taskId, provider, callProvider } = params;
  const label = PROVIDER_LABELS[provider];

  for (let attempt = 0; attempt < MAX_GENERATE_RETRIES; attempt++) {
    try {
      const response = await callProvider();

      if (response.id) {
        await videoTaskService.updateDuomiTaskId(taskId, response.id);
        await videoTaskService.updateTaskStatus(taskId, "running", 0);
        return null;
      }

      return new Error(`创建 ${label} 任务失败：无返回 ID`);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("未知错误");
      console.log(`[Generate] ${label} API 调用失败 (尝试 ${attempt + 1}/${MAX_GENERATE_RETRIES}):`, error.message);

      if (attempt > 0) {
        await videoTaskService.incrementRetryCount(taskId, "generate");
      }

      if (attempt < MAX_GENERATE_RETRIES - 1) {
        await delay(1000 * Math.pow(2, attempt));
      }

      if (attempt === MAX_GENERATE_RETRIES - 1) {
        return error;
      }
    }
  }

  return new Error("重试次数已用完");
}

export async function POST(request: NextRequest) {
  const session = await getServerSession();

  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  const userId = session.user.id;

  const activeCheck = await ensureUserActive(userId);
  if (!activeCheck.ok) {
    return NextResponse.json({ error: activeCheck.error }, { status: activeCheck.status });
  }

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
    const requestedVideoType: "fast" | "quality" =
      mode === "Quality" ? "quality" : "fast";
    const configuredProvider = generationConfig.providers[requestedVideoType];

    console.log("[Generate] generationConfig:", JSON.stringify(generationConfig));
    console.log("[Generate] configuredProvider:", configuredProvider);

    // 当前模式对应供应商为 VEO 时，固定模型和时长，统一归类为 fast
    const isVeo = configuredProvider === "veo";
    const model = isVeo
      ? "veo3.1-fast"
      : requestedVideoType === "quality"
        ? "sora-2-pro"
        : "sora-2-temporary";
    const videoType: "fast" | "quality" = isVeo ? "fast" : requestedVideoType;

    const creditCost = videoType === "fast"
      ? generationConfig.creditCosts.videoFast
      : generationConfig.creditCosts.videoQuality;
    const actualProvider: "veo" | "kie" | "duomi" = isVeo
      ? "veo"
      : configuredProvider;

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
      reason: `视频生成（${requestedVideoType === "fast" ? "快速" : "质量"}模式）`,
      referenceType: "video_task",
    });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://sora2.681023.xyz";
    const resolvedAspectRatio = aspectRatio === "9:16" ? "9:16" : "16:9";
    const resolvedDuration = isVeo ? 8 : (duration || 10);

    let task: Awaited<ReturnType<typeof videoTaskService.createTask>>;
    try {
      task = await videoTaskService.createTask({
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
    } catch (createTaskError) {
      await creditService.refundCredits({
        userId,
        amount: creditCost,
        reason: "视频任务创建失败 - 退款",
        referenceType: "credit_transaction",
        referenceId: transactionId,
        sourceTransactionId: transactionId,
      });
      throw createTaskError;
    }

    const lastError = await callProviderWithRetry({
      taskId: task.id,
      provider: actualProvider,
      callProvider: () => {
        if (actualProvider === "veo") {
          return veoService.createVideoTask({
            prompt,
            aspectRatio: resolvedAspectRatio,
            imageUrls: sourceImageUrl ? [sourceImageUrl] : undefined,
          });
        }
        if (actualProvider === "kie") {
          return kieService.createVideoTask({
            prompt,
            aspectRatio: resolvedAspectRatio,
            duration: resolvedDuration,
            imageUrl: sourceImageUrl,
            callbackUrl: `${baseUrl}/api/callback/kie`,
            progressCallbackUrl: `${baseUrl}/api/callback/kie`,
            isPro: model === "sora-2-pro",
          });
        }
        return duomiService.createVideoTask({
          prompt,
          model: model as "sora-2-temporary" | "sora-2-pro",
          aspectRatio: resolvedAspectRatio,
          duration: resolvedDuration,
          imageUrl: sourceImageUrl,
          callbackUrl: `${baseUrl}/api/callback`,
        });
      },
    });

    // 供应商调用失败
    if (lastError) {
      const transitionedTask = await videoTaskService.transitionToErrorIfActive({
        taskId: task.id,
        progress: 0,
        errorMessage: lastError.message,
      });

      if (transitionedTask) {
        await creditService.refundCredits({
          userId,
          amount: creditCost,
          reason: "视频生成失败 - 退款",
          referenceType: "video_task",
          referenceId: task.id,
          sourceTransactionId: task.creditTransactionId ?? undefined,
        });
      }
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
