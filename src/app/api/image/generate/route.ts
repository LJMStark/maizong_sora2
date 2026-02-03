import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
import { creditService } from "@/features/studio/services/credit-service";
import { imageTaskService } from "@/features/studio/services/image-task-service";
import { duomiImageService } from "@/features/studio/services/duomi-image-service";

const IMAGE_CREDIT_COST = 10;

export async function POST(request: NextRequest) {
  const session = await getServerSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const body = await request.json();
    const { prompt, model, aspectRatio, imageSize } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    const selectedModel = model || "gemini-2.5-flash-image";
    if (
      selectedModel !== "gemini-3-pro-image-preview" &&
      selectedModel !== "gemini-2.5-flash-image"
    ) {
      return NextResponse.json({ error: "Invalid model" }, { status: 400 });
    }

    const currentCredits = await creditService.getUserCredits(userId);
    if (currentCredits < IMAGE_CREDIT_COST) {
      return NextResponse.json(
        {
          error: "Insufficient credits",
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
          "Failed to create Duomi task"
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
        duomiError instanceof Error ? duomiError.message : "Unknown error";
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
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
