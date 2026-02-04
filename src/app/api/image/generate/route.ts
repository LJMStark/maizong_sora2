import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
import { creditService } from "@/features/studio/services/credit-service";
import { imageTaskService } from "@/features/studio/services/image-task-service";
import { duomiImageService } from "@/features/studio/services/duomi-image-service";
import { rateLimiter } from "@/lib/rate-limit";
import { GenerateImageSchema } from "@/lib/validations/schemas";
import { sanitizeError } from "@/lib/security/error-handler";

const IMAGE_CREDIT_COST = 10;

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

    // Validation
    const validation = GenerateImageSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.issues[0].message }, { status: 400 });
    }
    const { prompt, model, aspectRatio, imageSize } = validation.data;

    const selectedModel = model || "gemini-2.5-flash-image";
    if (
      selectedModel !== "gemini-3-pro-image-preview" &&
      selectedModel !== "gemini-2.5-flash-image"
    ) {
      return NextResponse.json({ error: "无效的模型" }, { status: 400 });
    }

    const currentCredits = await creditService.getUserCredits(userId);
    if (currentCredits < IMAGE_CREDIT_COST) {
      return NextResponse.json(
        {
          error: "积分不足",
          required: IMAGE_CREDIT_COST,
          current: currentCredits,
        },
        { status: 400 }
      );
    }

    const { transactionId } = await creditService.deductCredits({
      userId,
      amount: IMAGE_CREDIT_COST,
      reason: `Image Generation (${selectedModel})`,
      referenceType: "image_task",
    });

    const task = await imageTaskService.createTask({
      userId,
      mode: "generate",
      model: selectedModel,
      prompt,
      aspectRatio,
      creditCost: IMAGE_CREDIT_COST,
      creditTransactionId: transactionId,
    });

    try {
      const duomiResponse = await duomiImageService.createTextToImageTask({
        prompt,
        model: selectedModel,
        aspectRatio,
        imageSize,
      });

      if (duomiResponse.task_id) {
        await imageTaskService.updateDuomiTaskId(task.id, duomiResponse.task_id);
        await imageTaskService.updateTaskStatus(task.id, "running");
      } else {
        await imageTaskService.updateTaskStatus(
          task.id,
          "error",
          "创建 Duomi 任务失败"
        );
        await creditService.refundCredits({
          userId,
          amount: IMAGE_CREDIT_COST,
          reason: "Image generation failed - refund",
          referenceType: "image_task",
          referenceId: task.id,
        });
      }
    } catch (duomiError) {
      const errorMessage =
        duomiError instanceof Error ? duomiError.message : "未知错误";
      await imageTaskService.updateTaskStatus(task.id, "error", errorMessage);
      await creditService.refundCredits({
        userId,
        amount: IMAGE_CREDIT_COST,
        reason: "Image generation failed - refund",
        referenceType: "image_task",
        referenceId: task.id,
      });
    }

    return NextResponse.json({
      success: true,
      taskId: task.id,
      creditCost: IMAGE_CREDIT_COST,
    });
  } catch (error) {
    const message = sanitizeError(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
