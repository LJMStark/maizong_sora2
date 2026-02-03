import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
import { creditService } from "@/features/studio/services/credit-service";
import { videoTaskService } from "@/features/studio/services/video-task-service";
import { duomiService } from "@/features/studio/services/duomi-service";
import { storageService } from "@/features/studio/services/storage-service";

const CREDIT_COSTS = {
  "sora-2": 30,
  "sora-2-pro": 100,
} as const;

export async function POST(request: NextRequest) {
  const session = await getServerSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const body = await request.json();
    const { prompt, mode, aspectRatio, duration, imageBase64, imageMimeType } =
      body;

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    const model = mode === "Quality" ? "sora-2-pro" : "sora-2";
    const creditCost = CREDIT_COSTS[model];

    const currentCredits = await creditService.getUserCredits(userId);
    if (currentCredits < creditCost) {
      return NextResponse.json(
        { error: "Insufficient credits", required: creditCost, current: currentCredits },
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

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const callbackUrl = `${baseUrl}/api/callback`;

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
      } else {
        await videoTaskService.updateTaskStatus(
          task.id,
          "error",
          0,
          "Failed to create Duomi task"
        );
        await creditService.refundCredits({
          userId,
          amount: creditCost,
          reason: "Video generation failed - refund",
          referenceType: "video_task",
          referenceId: task.id,
        });
      }
    } catch (duomiError) {
      const errorMessage =
        duomiError instanceof Error ? duomiError.message : "Unknown error";
      await videoTaskService.updateTaskStatus(task.id, "error", 0, errorMessage);
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
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
