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
import { PptSampleActionSchema } from "@/lib/validations/schemas";
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
    const validation = PptSampleActionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }
    const { taskId, action, styleKey, anchorColor, promptOverride } =
      validation.data;

    const task = await pptTaskService.getTaskById(taskId);
    if (!task || task.userId !== userId) {
      return NextResponse.json({ error: "任务未找到" }, { status: 404 });
    }

    if (action === "confirm") {
      const transitioned = await pptTaskService.transitionTaskIfStatus(
        taskId,
        ["awaiting_confirm"],
        "generating"
      );
      if (!transitioned) {
        return NextResponse.json(
          { error: "任务当前不可确认（可能已在生成或已结束）" },
          { status: 409 }
        );
      }

      await pptPipelineService.advanceTask(taskId);
      return NextResponse.json({ success: true, status: "generating" });
    }

    // action === "regenerate"：样张重生成（可换风格），独立扣 1 页费
    const nextStyleKey = styleKey ?? task.styleKey;
    const resolved = getPptStyle(task.skillKey, nextStyleKey);
    if (!resolved) {
      return NextResponse.json({ error: "无效的风格选择" }, { status: 400 });
    }
    const { style } = resolved;

    const nextAnchorColor = anchorColor ?? task.anchorColor;
    if (nextAnchorColor && style.anchorColors) {
      const valid = style.anchorColors.some(
        (c) => c.hex === nextAnchorColor || c.name === nextAnchorColor
      );
      if (!valid) {
        return NextResponse.json({ error: "无效的锚点色" }, { status: 400 });
      }
    }

    // 先占位状态（并发守卫），再扣费；扣费失败回滚状态
    const claimed = await pptTaskService.transitionTaskIfStatus(
      taskId,
      ["awaiting_confirm"],
      "generating_sample"
    );
    if (!claimed) {
      return NextResponse.json(
        { error: "任务当前不可重生成样张" },
        { status: 409 }
      );
    }

    let regenTransactionId: string;
    try {
      const result = await creditService.deductCredits({
        userId,
        amount: task.creditCostPerPage,
        reason: "PPT 样张重生成",
        referenceType: "ppt_task",
        referenceId: taskId,
      });
      regenTransactionId = result.transactionId;
    } catch (err) {
      await pptTaskService.transitionTaskIfStatus(
        taskId,
        ["generating_sample"],
        "awaiting_confirm"
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

    const styleChanged =
      nextStyleKey !== task.styleKey || nextAnchorColor !== task.anchorColor;
    if (styleChanged) {
      await pptTaskService.updateTaskStyle(taskId, {
        styleKey: nextStyleKey,
        anchorColor: nextAnchorColor,
      });
    }

    const outline = task.outline;
    const hasRefImages = Boolean(
      task.templateRefImageUrls && task.templateRefImageUrls.length > 0
    );

    // 换风格后同步剩余待生成页的提示词
    if (styleChanged) {
      const prompts = new Map<number, string>();
      for (const slide of outline.slice(1)) {
        prompts.set(
          slide.index,
          buildSlidePrompt({
            style,
            anchorColor: nextAnchorColor,
            slide,
            pageCount: task.pageCount,
            deckTitle: task.title,
            templateProfile: task.templateProfile,
            hasRefImages,
          })
        );
      }
      await pptTaskService.updatePendingSlidePrompts(taskId, prompts);
    }

    const sampleOutline = {
      ...outline[0],
      promptOverride: promptOverride ?? outline[0]?.promptOverride,
    };
    const samplePrompt = buildSlidePrompt({
      style,
      anchorColor: nextAnchorColor,
      slide: sampleOutline,
      pageCount: task.pageCount,
      deckTitle: task.title,
      templateProfile: task.templateProfile,
      hasRefImages,
    });

    const sampleSlide = await pptTaskService.getSlideByIndex(taskId, 1);
    if (!sampleSlide) {
      // 数据异常：回滚扣费与状态
      await creditService.refundCredits({
        userId,
        amount: task.creditCostPerPage,
        reason: "PPT 样张重生成失败 - 退款",
        referenceType: "ppt_task",
        referenceId: taskId,
        sourceTransactionId: regenTransactionId,
      });
      await pptTaskService.transitionTaskIfStatus(
        taskId,
        ["generating_sample"],
        "awaiting_confirm"
      );
      return NextResponse.json({ error: "样张页不存在" }, { status: 500 });
    }

    await pptTaskService.resetSlideForRegen(sampleSlide.id, {
      prompt: samplePrompt,
      regenTransactionId,
    });

    await pptPipelineService.advanceTask(taskId);

    return NextResponse.json({
      success: true,
      status: "generating_sample",
      creditCost: task.creditCostPerPage,
    });
  } catch (error) {
    return studioRouteErrorResponse(error);
  }
}
