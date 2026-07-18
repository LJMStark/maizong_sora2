import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
import { ensureUserActive } from "@/lib/auth/ensure-active-user";
import { rateLimiter } from "@/lib/rate-limit";
import { pptTemplateService } from "@/features/studio/services/ppt-template-service";
import { PptTemplateAnalyzeSchema } from "@/lib/validations/schemas";
import { sanitizeError } from "@/lib/security/error-handler";

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

  const { success } = await rateLimiter.limit(userId, "pptTemplateAnalyze");
  if (!success) {
    return NextResponse.json({ error: "请求过于频繁，请稍后重试" }, { status: 429 });
  }

  try {
    const body = await request.json();
    const validation = PptTemplateAnalyzeSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const result = await pptTemplateService.analyzeTemplate({
      userId,
      pptxBase64: validation.data.pptxBase64,
      images: validation.data.images,
    });

    return NextResponse.json({
      success: true,
      templateProfile: result.templateProfile,
      refImageUrls: result.refImageUrls,
    });
  } catch (error) {
    console.error("[PPT Template Analyze] Error:", error);
    return NextResponse.json(
      { error: `模板分析失败：${sanitizeError(error)}` },
      { status: 500 }
    );
  }
}
