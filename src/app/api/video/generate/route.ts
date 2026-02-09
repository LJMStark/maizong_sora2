import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
import { creditService } from "@/features/studio/services/credit-service";
import { videoTaskService } from "@/features/studio/services/video-task-service";
import { videoLimitService } from "@/features/studio/services/video-limit-service";
import { duomiService } from "@/features/studio/services/duomi-service";
import { kieService } from "@/features/studio/services/kie-service";
import { storageService } from "@/features/studio/services/storage-service";
import { rateLimiter } from "@/lib/rate-limit";
import { GenerateVideoSchema } from "@/lib/validations/schemas";
import { sanitizeError } from "@/lib/security/error-handler";
import type { VideoProvider } from "@/features/studio/services/video-task-service";

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

    // 获取供应商启用状态
    const providerSettings = await videoLimitService.getProviderSettings();

    if (!providerSettings.kieEnabled && !providerSettings.duomiEnabled) {
      return NextResponse.json(
        { error: "当前没有可用的视频供应商，请联系管理员" },
        { status: 503 }
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
    const resolvedDuration = duration || 10;

    // 根据配置决定供应商优先级: KIE 优先 -> Duomi 备选
    const defaultProvider: VideoProvider = providerSettings.kieEnabled ? "kie" : "duomi";
    let usedProvider: VideoProvider = defaultProvider;

    const task = await videoTaskService.createTask({
      userId,
      model,
      prompt,
      aspectRatio: aspectRatio || "16:9",
      duration: resolvedDuration,
      sourceImageUrl,
      creditCost,
      creditTransactionId: transactionId,
      provider: defaultProvider,
    });

    let lastError: Error | null = null;

    // 尝试 KIE AI
    if (providerSettings.kieEnabled && process.env.KIE_AI_API_KEY) {
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
          });

          if (kieResponse.id) {
            usedProvider = "kie";
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
    }

    // KIE 失败或未启用 -> 尝试 Duomi（仅在 Duomi 启用时）
    if (providerSettings.duomiEnabled && (lastError || !providerSettings.kieEnabled)) {
      if (lastError) {
        console.log("[Generate] KIE AI 全部失败，降级到 Duomi");
      }

      const duomiCallbackUrl = `${baseUrl}/api/callback`;
      lastError = null;

      for (let attempt = 0; attempt < MAX_GENERATE_RETRIES; attempt++) {
        try {
          const duomiResponse = await duomiService.createVideoTask({
            prompt,
            model,
            aspectRatio: resolvedAspectRatio,
            duration: resolvedDuration,
            imageUrl: sourceImageUrl,
            callbackUrl: duomiCallbackUrl,
          });

          if (duomiResponse.id) {
            usedProvider = "duomi";
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

    // 更新实际使用的 provider
    if (!lastError && usedProvider !== defaultProvider) {
      await videoTaskService.updateProvider(task.id, usedProvider);
    }

    // 所有 provider 都失败
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
