import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
import { videoTaskService } from "@/features/studio/services/video-task-service";
import { duomiService } from "@/features/studio/services/duomi-service";
import { kieService } from "@/features/studio/services/kie-service";
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
    const task = await videoTaskService.getTaskById(taskId);

    if (!task) {
      return NextResponse.json({ error: "任务未找到" }, { status: 404 });
    }

    if (task.userId !== session.user.id) {
      return NextResponse.json({ error: "禁止访问" }, { status: 403 });
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
        isRetrying: false,
        canRetry: task.status === "error",
        generateRetryCount: task.generateRetryCount ?? 0,
        callbackRetryCount: task.callbackRetryCount ?? 0,
      });
    }

    // If task is retrying, return retrying state
    if (task.status === "retrying") {
      return NextResponse.json({
        id: task.id,
        status: "retrying",
        progress: task.progress,
        videoUrl: null,
        errorMessage: null,
        prompt: task.prompt,
        createdAt: task.createdAt,
        completedAt: null,
        isRetrying: true,
        canRetry: false,
        generateRetryCount: task.generateRetryCount ?? 0,
        callbackRetryCount: task.callbackRetryCount ?? 0,
      });
    }

    // If task has no duomiTaskId, it means it failed to create
    if (!task.duomiTaskId) {
      return NextResponse.json({
        id: task.id,
        status: task.status,
        progress: task.progress,
        errorMessage: task.errorMessage || "任务创建中",
        prompt: task.prompt,
        createdAt: task.createdAt,
        completedAt: task.completedAt,
        isRetrying: false,
        canRetry: false,
        generateRetryCount: task.generateRetryCount ?? 0,
        callbackRetryCount: task.callbackRetryCount ?? 0,
      });
    }

    // Poll provider API for status (fallback when callback is missing)
    try {
      const isKieProvider = task.provider === "kie";

      const providerStatus = isKieProvider
        ? await kieService.getVideoTaskStatus(task.duomiTaskId)
        : await duomiService.getVideoTaskStatus(task.duomiTaskId);

      const state = providerStatus.state;
      const progress =
        typeof providerStatus.progress === "number"
          ? providerStatus.progress
          : task.progress;
      const providerVideoUrl = providerStatus.data?.videos?.[0]?.url;

      if (state === "succeeded") {
        if (!providerVideoUrl) {
          await videoTaskService.updateTaskStatus(
            task.id,
            "error",
            progress,
            "状态中缺少视频 URL"
          );
          return NextResponse.json({
            id: task.id,
            status: "error",
            progress,
            errorMessage: "状态中缺少视频 URL",
            prompt: task.prompt,
            createdAt: task.createdAt,
            completedAt: new Date(),
            isRetrying: false,
            canRetry: true,
            generateRetryCount: task.generateRetryCount ?? 0,
            callbackRetryCount: task.callbackRetryCount ?? 0,
          });
        }

        let finalVideoUrl = providerVideoUrl;
        try {
          finalVideoUrl = await storageService.uploadVideoFromUrl(
            task.userId,
            task.id,
            providerVideoUrl
          );
        } catch {
          // If upload fails, use the original provider URL
        }

        await videoTaskService.updateTaskVideoUrls(
          task.id,
          providerVideoUrl,
          finalVideoUrl
        );

        return NextResponse.json({
          id: task.id,
          status: "succeeded",
          progress: 100,
          videoUrl: finalVideoUrl,
          prompt: task.prompt,
          createdAt: task.createdAt,
          completedAt: new Date(),
          isRetrying: false,
          canRetry: false,
          generateRetryCount: task.generateRetryCount ?? 0,
          callbackRetryCount: task.callbackRetryCount ?? 0,
        });
      } else if (state === "error") {
        const errorMessage = providerStatus.message || providerStatus.error || "视频生成失败";
        await videoTaskService.updateTaskStatus(
          task.id,
          "error",
          progress,
          errorMessage
        );

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
          progress,
          errorMessage,
          prompt: task.prompt,
          createdAt: task.createdAt,
          completedAt: new Date(),
          isRetrying: false,
          canRetry: true,
          generateRetryCount: task.generateRetryCount ?? 0,
          callbackRetryCount: task.callbackRetryCount ?? 0,
        });
      } else {
        const mappedStatus = state === "running" ? "running" : "pending";
        if (task.status !== mappedStatus || task.progress !== progress) {
          await videoTaskService.updateTaskStatus(task.id, mappedStatus, progress);
        }

        return NextResponse.json({
          id: task.id,
          status: mappedStatus,
          progress,
          videoUrl: task.finalVideoUrl || task.duomiVideoUrl,
          errorMessage: task.errorMessage,
          prompt: task.prompt,
          createdAt: task.createdAt,
          completedAt: task.completedAt,
          isRetrying: false,
          canRetry: false,
          generateRetryCount: task.generateRetryCount ?? 0,
          callbackRetryCount: task.callbackRetryCount ?? 0,
        });
      }
    } catch (pollError) {
      const message = pollError instanceof Error ? pollError.message : "获取状态失败";
      const taskStatus = task.status as string;
      return NextResponse.json({
        id: task.id,
        status: task.status,
        progress: task.progress,
        videoUrl: task.finalVideoUrl || task.duomiVideoUrl,
        errorMessage: message,
        prompt: task.prompt,
        createdAt: task.createdAt,
        completedAt: task.completedAt,
        isRetrying: taskStatus === "retrying",
        canRetry: taskStatus === "error",
        generateRetryCount: task.generateRetryCount ?? 0,
        callbackRetryCount: task.callbackRetryCount ?? 0,
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
