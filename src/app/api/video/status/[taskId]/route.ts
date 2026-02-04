import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
import { videoTaskService } from "@/features/studio/services/video-task-service";
import { duomiService } from "@/features/studio/services/duomi-service";
import { storageService } from "@/features/studio/services/storage-service";
import { creditService } from "@/features/studio/services/credit-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const session = await getServerSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { taskId } = await params;

  try {
    const task = await videoTaskService.getTaskById(taskId);

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (task.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // If task is already completed or has an error, return current state
    if (task.status === "succeeded" || task.status === "error") {
      return NextResponse.json({
        id: task.id,
        status: task.status,
        progress: task.status === "succeeded" ? 100 : task.progress,
        videoUrl: task.finalVideoUrl || task.duomiVideoUrl,
        errorMessage: task.errorMessage,
        prompt: task.prompt,
        createdAt: task.createdAt,
        completedAt: task.completedAt,
      });
    }

    // If task has no duomiTaskId, it means it failed to create
    if (!task.duomiTaskId) {
      return NextResponse.json({
        id: task.id,
        status: task.status,
        progress: task.progress,
        errorMessage: task.errorMessage || "Task creation pending",
        prompt: task.prompt,
        createdAt: task.createdAt,
        completedAt: task.completedAt,
      });
    }

    // Poll Duomi API for status
    try {
      const duomiStatus = await duomiService.getVideoStatus(task.duomiTaskId);

      if (duomiStatus.status === "completed" && duomiStatus.video_url) {
        // Upload to Supabase for permanent storage
        let finalVideoUrl = duomiStatus.video_url;
        try {
          finalVideoUrl = await storageService.uploadVideoFromUrl(
            task.userId,
            task.id,
            duomiStatus.video_url
          );
        } catch {
          // If upload fails, use the original Duomi URL
        }

        await videoTaskService.updateTaskVideoUrls(
          task.id,
          duomiStatus.video_url,
          finalVideoUrl
        );

        return NextResponse.json({
          id: task.id,
          status: "succeeded",
          progress: 100,
          videoUrl: finalVideoUrl,
          prompt: task.prompt,
          createdAt: task.createdAt,
          completedAt: new Date().toISOString(),
        });
      } else if (duomiStatus.status === "failed") {
        const errorMessage = duomiStatus.error || "Video generation failed";
        await videoTaskService.updateTaskStatus(task.id, "error", 0, errorMessage);

        // Refund credits on error
        await creditService.refundCredits({
          userId: task.userId,
          amount: task.creditCost,
          reason: "Video generation failed - refund",
          referenceType: "video_task",
          referenceId: task.id,
        });

        return NextResponse.json({
          id: task.id,
          status: "error",
          progress: 0,
          errorMessage,
          prompt: task.prompt,
          createdAt: task.createdAt,
          completedAt: null,
        });
      } else {
        // Still running or pending
        const mappedStatus = duomiStatus.status === "in_progress" ? "running" : "pending";
        if (mappedStatus !== task.status) {
          await videoTaskService.updateTaskStatus(task.id, mappedStatus, 0);
        }

        return NextResponse.json({
          id: task.id,
          status: mappedStatus,
          progress: task.progress,
          videoUrl: null,
          errorMessage: null,
          prompt: task.prompt,
          createdAt: task.createdAt,
          completedAt: null,
        });
      }
    } catch (pollError) {
      // If polling fails, return current database state
      return NextResponse.json({
        id: task.id,
        status: task.status,
        progress: task.progress,
        videoUrl: task.finalVideoUrl || task.duomiVideoUrl,
        errorMessage: task.errorMessage,
        prompt: task.prompt,
        createdAt: task.createdAt,
        completedAt: task.completedAt,
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
