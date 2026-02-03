import { NextRequest, NextResponse } from "next/server";
import { videoTaskService } from "@/features/studio/services/video-task-service";
import { storageService } from "@/features/studio/services/storage-service";
import { creditService } from "@/features/studio/services/credit-service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
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
