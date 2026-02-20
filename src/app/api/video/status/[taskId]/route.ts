import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
import { videoTaskService } from "@/features/studio/services/video-task-service";
import { duomiService } from "@/features/studio/services/duomi-service";
import { kieService } from "@/features/studio/services/kie-service";
import { veoService } from "@/features/studio/services/veo-service";
import { storageService } from "@/features/studio/services/storage-service";
import { creditService } from "@/features/studio/services/credit-service";
import type { VideoTaskType } from "@/db/schema";

function buildTaskResponse(
  task: VideoTaskType,
  overrides: Partial<{
    status: string;
    progress: number;
    videoUrl: string | null;
    errorMessage: string | null;
    completedAt: Date | null;
    isRetrying: boolean;
    canRetry: boolean;
  }> = {}
) {
  return {
    id: task.id,
    status: overrides.status ?? task.status,
    progress: overrides.progress ?? task.progress,
    videoUrl: overrides.videoUrl !== undefined ? overrides.videoUrl : (task.finalVideoUrl || task.duomiVideoUrl || null),
    errorMessage: overrides.errorMessage !== undefined ? overrides.errorMessage : task.errorMessage,
    prompt: task.prompt,
    createdAt: task.createdAt,
    completedAt: overrides.completedAt !== undefined ? overrides.completedAt : task.completedAt,
    isRetrying: overrides.isRetrying ?? false,
    canRetry: overrides.canRetry ?? false,
    generateRetryCount: task.generateRetryCount ?? 0,
    callbackRetryCount: task.callbackRetryCount ?? 0,
  };
}

function getProviderStatusFetcher(provider: string | null) {
  switch (provider) {
    case "kie":
      return kieService.getVideoTaskStatus.bind(kieService);
    case "veo":
      return veoService.getVideoTaskStatus.bind(veoService);
    default:
      return duomiService.getVideoTaskStatus.bind(duomiService);
  }
}

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

    if (task.status === "succeeded" || task.status === "error") {
      return NextResponse.json(buildTaskResponse(task, {
        progress: task.status === "succeeded" ? 100 : task.progress,
        canRetry: task.status === "error",
      }));
    }

    if (task.status === "retrying") {
      return NextResponse.json(buildTaskResponse(task, {
        videoUrl: null,
        errorMessage: null,
        completedAt: null,
        isRetrying: true,
      }));
    }

    if (!task.duomiTaskId) {
      return NextResponse.json(buildTaskResponse(task, {
        errorMessage: task.errorMessage || "任务创建中",
      }));
    }

    try {
      const fetchStatus = getProviderStatusFetcher(task.provider);
      const providerStatus = await fetchStatus(task.duomiTaskId);

      const state = providerStatus.state;
      const progress =
        typeof providerStatus.progress === "number"
          ? providerStatus.progress
          : task.progress;
      const providerVideoUrl = providerStatus.data?.videos?.[0]?.url;

      if (state === "succeeded") {
        if (!providerVideoUrl) {
          const transitionedTask = await videoTaskService.transitionToErrorIfActive({
            taskId: task.id,
            progress,
            errorMessage: "状态中缺少视频 URL",
          });

          if (transitionedTask) {
            await creditService.refundCredits({
              userId: task.userId,
              amount: task.creditCost,
              reason: "视频生成失败 - 缺少视频地址",
              referenceType: "video_task",
              referenceId: task.id,
            });
          }

          return NextResponse.json(buildTaskResponse(task, {
            status: "error",
            progress,
            errorMessage: "状态中缺少视频 URL",
            completedAt: new Date(),
            canRetry: true,
          }));
        }

        let finalVideoUrl = providerVideoUrl;
        try {
          finalVideoUrl = await storageService.uploadVideoFromUrl(task.userId, task.id, providerVideoUrl);
        } catch (uploadError) {
          console.error("[Video Status] 上传视频到存储失败:", {
            taskId: task.id,
            userId: task.userId,
            providerVideoUrl,
            error: uploadError,
          });
          // If upload fails, use the original provider URL
        }

        const updatedTask = await videoTaskService.updateTaskVideoUrls(
          task.id,
          providerVideoUrl,
          finalVideoUrl
        );

        if (!updatedTask) {
          const latestTask = await videoTaskService.getTaskById(task.id);
          if (!latestTask) {
            return NextResponse.json({ error: "任务未找到" }, { status: 404 });
          }
          return NextResponse.json(buildTaskResponse(latestTask, {
            progress: latestTask.status === "succeeded" ? 100 : latestTask.progress,
            canRetry: latestTask.status === "error",
          }));
        }

        return NextResponse.json(buildTaskResponse(updatedTask, {
          status: "succeeded",
          progress: 100,
          videoUrl: finalVideoUrl,
          completedAt: new Date(),
        }));
      }

      if (state === "error") {
        const errorMessage = providerStatus.message || providerStatus.error || "视频生成失败";
        const transitionedTask = await videoTaskService.transitionToErrorIfActive({
          taskId: task.id,
          progress,
          errorMessage,
        });

        if (transitionedTask) {
          await creditService.refundCredits({
            userId: task.userId,
            amount: task.creditCost,
            reason: "视频生成失败 - 退款",
            referenceType: "video_task",
            referenceId: task.id,
          });
        }

        return NextResponse.json(buildTaskResponse(task, {
          status: "error",
          progress,
          errorMessage,
          completedAt: new Date(),
          canRetry: true,
        }));
      }

      const mappedStatus = state === "running" ? "running" : "pending";
      if (task.status !== mappedStatus || task.progress !== progress) {
        await videoTaskService.updateTaskStatus(task.id, mappedStatus, progress);
      }

      return NextResponse.json(buildTaskResponse(task, {
        status: mappedStatus,
        progress,
      }));
    } catch (pollError) {
      const message = pollError instanceof Error ? pollError.message : "获取状态失败";
      const statusStr = task.status as string;
      return NextResponse.json(buildTaskResponse(task, {
        errorMessage: message,
        isRetrying: statusStr === "retrying",
        canRetry: statusStr === "error",
      }));
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
