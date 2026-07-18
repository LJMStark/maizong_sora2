import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
import { ensureUserActive } from "@/lib/auth/ensure-active-user";
import { rateLimiter } from "@/lib/rate-limit";
import {
  creditService,
  InsufficientCreditsError,
} from "@/features/studio/services/credit-service";
import { videoLimitService } from "@/features/studio/services/video-limit-service";
import { pptLimitService } from "@/features/studio/services/ppt-limit-service";
import { pptTaskService } from "@/features/studio/services/ppt-task-service";
import { pptPipelineService } from "@/features/studio/services/ppt-pipeline-service";
import { studioSessionService } from "@/features/studio/services/studio-session-service";
import { buildAllSlidePrompts } from "@/features/studio/services/ppt-prompt-builder";
import { getPptStyle } from "@/features/studio/data/ppt-skills";
import { PptGenerateSchema } from "@/lib/validations/schemas";
import { studioRouteErrorResponse } from "@/lib/api/studio-route-error";

export const maxDuration = 60;

/** 参考图只允许来自本站 Supabase 存储（analyze 路由的产物） */
function validateRefImageUrls(urls: string[] | undefined): string | null {
  if (!urls || urls.length === 0) return null;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return "参考图功能未配置";
  for (const url of urls) {
    if (!url.startsWith(supabaseUrl)) {
      return "参考图地址无效";
    }
  }
  return null;
}

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
    const validation = PptGenerateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }
    const data = validation.data;

    const resolved = getPptStyle(data.skillKey, data.styleKey);
    if (!resolved) {
      return NextResponse.json({ error: "无效的风格选择" }, { status: 400 });
    }
    const { style } = resolved;

    if (data.anchorColor && style.anchorColors) {
      const valid = style.anchorColors.some(
        (c) => c.hex === data.anchorColor || c.name === data.anchorColor
      );
      if (!valid) {
        return NextResponse.json({ error: "无效的锚点色" }, { status: 400 });
      }
    }

    const refUrlError = validateRefImageUrls(data.templateRefImageUrls);
    if (refUrlError) {
      return NextResponse.json({ error: refUrlError }, { status: 400 });
    }

    const limitCheck = await pptLimitService.checkLimit(userId);
    if (!limitCheck.allowed) {
      return NextResponse.json({ error: limitCheck.reason }, { status: 400 });
    }

    const generationConfig = await videoLimitService.getVideoGenerationConfig();
    const creditCostPerPage = generationConfig.creditCosts.pptPage;
    const creditCostTotal = creditCostPerPage * data.pageCount;

    const studioSession = await studioSessionService.getOrCreateSession({
      userId,
      type: "ppt",
      title: data.title,
      sessionId: data.sessionId,
    });

    // 整套预扣（advisory lock 事务内原子校验余额）
    let transactionId: string;
    try {
      const result = await creditService.deductCredits({
        userId,
        amount: creditCostTotal,
        reason: `PPT 生成（${data.pageCount} 页 × ${creditCostPerPage}）`,
        referenceType: "ppt_task",
      });
      transactionId = result.transactionId;
    } catch (err) {
      if (err instanceof InsufficientCreditsError) {
        const currentCredits = await creditService.getUserCredits(userId);
        return NextResponse.json(
          {
            error: "积分不足",
            required: creditCostTotal,
            current: currentCredits,
          },
          { status: 400 }
        );
      }
      throw err;
    }

    const hasRefImages = Boolean(
      data.templateRefImageUrls && data.templateRefImageUrls.length > 0
    );
    const slidePrompts = buildAllSlidePrompts({
      style,
      anchorColor: data.anchorColor,
      outline: data.outline,
      deckTitle: data.title,
      templateProfile: data.templateProfile,
      hasRefImages,
    });

    let task;
    try {
      const created = await pptTaskService.createTaskWithSlides({
        userId,
        sessionId: studioSession.id,
        title: data.title,
        skillKey: data.skillKey,
        styleKey: data.styleKey,
        anchorColor: data.anchorColor,
        resolution: data.resolution,
        pageCount: data.pageCount,
        outline: data.outline,
        templateProfile: data.templateProfile,
        templateRefImageUrls: data.templateRefImageUrls,
        sampleFirst: data.sampleFirst,
        speechNotesEnabled: data.speechNotesEnabled,
        creditCostPerPage,
        creditCostTotal,
        creditTransactionId: transactionId,
        slidePrompts,
      });
      task = created.task;
    } catch (createError) {
      await creditService.refundCredits({
        userId,
        amount: creditCostTotal,
        reason: "PPT 任务创建失败 - 退款",
        referenceType: "credit_transaction",
        referenceId: transactionId,
        sourceTransactionId: transactionId,
      });
      throw createError;
    }

    // kick 第 1 页（失败由管线按重试/退款策略处理）
    await pptPipelineService.advanceTask(task.id);

    return NextResponse.json({
      success: true,
      taskId: task.id,
      sessionId: studioSession.id,
      creditCostTotal,
      creditCostPerPage,
    });
  } catch (error) {
    return studioRouteErrorResponse(error);
  }
}
