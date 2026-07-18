import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
import { ensureUserActive } from "@/lib/auth/ensure-active-user";
import { rateLimiter } from "@/lib/rate-limit";
import {
  creditService,
  InsufficientCreditsError,
} from "@/features/studio/services/credit-service";
import { pptTaskService } from "@/features/studio/services/ppt-task-service";
import { pptPipelineService } from "@/features/studio/services/ppt-pipeline-service";
import { buildSlidePrompt } from "@/features/studio/services/ppt-prompt-builder";
import { getPptStyle } from "@/features/studio/data/ppt-skills";
import { PptSlideRegenerateSchema } from "@/lib/validations/schemas";
import { studioRouteErrorResponse } from "@/lib/api/studio-route-error";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const session = await getServerSession();

  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  const userId = session.user.id;

  const activeCheck = await ensureUserActive(userId);
  if (!activeCheck.ok) {
    return NextResponse.json({ error: activeCheck.error }, { status: activeCheck.status });
  }

  const { success } = await rateLimiter.limit(userId, "pptGenerate");
  if (!success) {
    return NextResponse.json({ error: "请求过于频繁，请稍后重试" }, { status: 429 });
  }

  try {
    const body = await request.json();
    const validation = PptSlideRegenerateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }
    const { taskId, slideIndex, promptOverride } = validation.data;

    const task = await pptTaskService.getTaskById(taskId);
    if (!task || task.userId !== userId) {
      return NextResponse.json({ error: "任务未找到" }, { status: 404 });
    }

    if (task.status !== "succeeded" && task.status !== "partial") {
      return NextResponse.json(
        { error: "仅已完成的任务支持单页重生成" },
        { status: 409 }
      );
    }
    const priorStatus = task.status;

    const slide = await pptTaskService.getSlideByIndex(taskId, slideIndex);
    if (!slide) {
      return NextResponse.json({ error: "页面不存在" }, { status: 404 });
    }
    if (
      slide.status !== "succeeded" &&
      slide.status !== "error" &&
      slide.status !== "cancelled"
    ) {
      return NextResponse.json({ error: "该页正在生成中" }, { status: 409 });
    }

    // 先占位任务状态（并发守卫），扣费失败回滚
    const claimed = await pptTaskService.transitionTaskIfStatus(
      taskId,
      ["succeeded", "partial"],
      "generating"
    );
    if (!claimed) {
      return NextResponse.json(
        { error: "任务状态已变化，请刷新后重试" },
        { status: 409 }
      );
    }

    let regenTransactionId: string;
    try {
      const result = await creditService.deductCredits({
        userId,
        amount: task.creditCostPerPage,
        reason: `PPT 第 ${slideIndex} 页重生成`,
        referenceType: "ppt_slide",
        referenceId: slide.id,
      });
      regenTransactionId = result.transactionId;
    } catch (err) {
      await pptTaskService.transitionTaskIfStatus(
        taskId,
        ["generating"],
        priorStatus
      );
      if (err instanceof InsufficientCreditsError) {
        const currentCredits = await creditService.getUserCredits(userId);
        return NextResponse.json(
          {
            error: "积分不足",
            required: task.creditCostPerPage,
            current: currentCredits,
          },
          { status: 400 }
        );
      }
      throw err;
    }

    // 有提示词微调时基于大纲重建该页提示词
    let prompt: string | undefined;
    if (promptOverride?.trim()) {
      const resolved = getPptStyle(task.skillKey, task.styleKey);
      const outlineSlide = task.outline.find((s) => s.index === slideIndex);
      if (resolved && outlineSlide) {
        prompt = buildSlidePrompt({
          style: resolved.style,
          anchorColor: task.anchorColor,
          slide: { ...outlineSlide, promptOverride: promptOverride.trim() },
          pageCount: task.pageCount,
          deckTitle: task.title,
          templateProfile: task.templateProfile,
          hasRefImages: Boolean(
            task.templateRefImageUrls && task.templateRefImageUrls.length > 0
          ),
        });
      }
    }

    await pptTaskService.resetSlideForRegen(slide.id, {
      prompt,
      regenTransactionId,
    });

    await pptPipelineService.advanceTask(taskId);

    return NextResponse.json({
      success: true,
      slideIndex,
      creditCost: task.creditCostPerPage,
    });
  } catch (error) {
    return studioRouteErrorResponse(error);
  }
}
