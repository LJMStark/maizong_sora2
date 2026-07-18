import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
import { pptTaskService } from "@/features/studio/services/ppt-task-service";
import { pptPipelineService } from "@/features/studio/services/ppt-pipeline-service";
import { sanitizeError } from "@/lib/security/error-handler";
import type { PptSlideType, PptTaskType } from "@/db/schema";

export const maxDuration = 60;

function buildSnapshot(task: PptTaskType, slides: PptSlideType[]) {
  const succeeded = slides.filter((s) => s.status === "succeeded").length;
  const failed = slides.filter((s) => s.status === "error").length;
  const active = slides.find(
    (s) => s.status === "running" || s.status === "queued"
  );

  return {
    taskId: task.id,
    sessionId: task.sessionId,
    status: task.status,
    title: task.title,
    skillKey: task.skillKey,
    styleKey: task.styleKey,
    anchorColor: task.anchorColor,
    resolution: task.resolution,
    pageCount: task.pageCount,
    sampleFirst: task.sampleFirst,
    speechNotesEnabled: task.speechNotesEnabled,
    creditCostPerPage: task.creditCostPerPage,
    creditCostTotal: task.creditCostTotal,
    refundedCredits: task.refundedCredits,
    errorMessage: task.errorMessage,
    progress: {
      succeeded,
      failed,
      total: task.pageCount,
      currentIndex: active?.slideIndex ?? null,
    },
    slides: slides.map((s) => ({
      slideIndex: s.slideIndex,
      title: s.title,
      status: s.status,
      finalImageUrl: s.finalImageUrl,
      retryCount: s.retryCount,
      errorMessage: s.errorMessage,
      speechNotes: s.speechNotes,
      isSample: s.isSample,
      refunded: s.refunded,
    })),
  };
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
    const task = await pptTaskService.getTaskById(taskId);

    if (!task || task.userId !== session.user.id) {
      return NextResponse.json({ error: "任务未找到" }, { status: 404 });
    }

    // 活跃任务：本次轮询顺带推进流水线（查询在途页 / 认领下一页）
    if (pptTaskService.isTaskActive(task)) {
      await pptPipelineService.advanceTask(taskId);
    }

    const [freshTask, slides] = await Promise.all([
      pptTaskService.getTaskById(taskId),
      pptTaskService.getSlides(taskId),
    ]);

    if (!freshTask) {
      return NextResponse.json({ error: "任务未找到" }, { status: 404 });
    }

    return NextResponse.json(buildSnapshot(freshTask, slides));
  } catch (error) {
    return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
  }
}
