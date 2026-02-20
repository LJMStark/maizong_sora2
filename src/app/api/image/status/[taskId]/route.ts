import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
import { imageTaskService } from "@/features/studio/services/image-task-service";
import { duomiImageService } from "@/features/studio/services/duomi-image-service";
import { storageService } from "@/features/studio/services/storage-service";
import { creditService } from "@/features/studio/services/credit-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const session = await getServerSession();

  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  const { taskId } = await params;

  try {
    const task = await imageTaskService.getTaskById(taskId);

    if (!task) {
      return NextResponse.json({ error: "任务未找到" }, { status: 404 });
    }

    if (task.userId !== session.user.id) {
      return NextResponse.json({ error: "禁止访问" }, { status: 403 });
    }

    // If task is already completed or has an error, return current state
    if (task.status === "succeeded" || task.status === "error") {
      return NextResponse.json({
        taskId: task.id,
        status: task.status,
        imageUrl: task.finalImageUrl,
        errorMessage: task.errorMessage,
      });
    }

    // If task has no duomiTaskId, it means it failed to create
    if (!task.duomiTaskId) {
      return NextResponse.json({
        taskId: task.id,
        status: task.status,
        errorMessage: task.errorMessage || "任务创建中",
      });
    }

    // Poll Duomi API for status
    try {
      const duomiStatus = await duomiImageService.getTaskStatus(task.duomiTaskId);

      if (duomiStatus.state === "succeeded" && duomiStatus.data?.images?.[0]) {
        const duomiImageUrl = duomiStatus.data.images[0].url;

        // Upload to Supabase for permanent storage
        let finalImageUrl = duomiImageUrl;
        try {
          finalImageUrl = await storageService.uploadImageFromUrl(
            task.userId,
            task.id,
            duomiImageUrl
          );
        } catch (uploadError) {
          console.error("[Image Status] 上传图片到存储失败:", {
            taskId: task.id,
            userId: task.userId,
            duomiImageUrl,
            error: uploadError,
          });
          // If upload fails, use the original Duomi URL
        }

        await imageTaskService.updateTaskImageUrls(
          task.id,
          duomiImageUrl,
          finalImageUrl
        );

        return NextResponse.json({
          taskId: task.id,
          status: "succeeded",
          imageUrl: finalImageUrl,
        });
      } else if (duomiStatus.state === "error") {
        const errorMessage = duomiStatus.error || "图片生成失败";
        await imageTaskService.updateTaskStatus(task.id, "error", errorMessage);

        // Refund credits on error
        await creditService.refundCredits({
          userId: task.userId,
          amount: task.creditCost,
          reason: "图片生成失败 - 退款",
          referenceType: "image_task",
          referenceId: task.id,
        });

        return NextResponse.json({
          taskId: task.id,
          status: "error",
          errorMessage,
        });
      } else {
        // Still running or pending
        if (duomiStatus.state === "running" && task.status !== "running") {
          await imageTaskService.updateTaskStatus(task.id, "running");
        }

        return NextResponse.json({
          taskId: task.id,
          status: duomiStatus.state,
        });
      }
    } catch (pollError) {
      const errorMessage =
        pollError instanceof Error ? pollError.message : "获取状态失败";
      return NextResponse.json({
        taskId: task.id,
        status: task.status,
        errorMessage,
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
