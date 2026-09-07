import { NextResponse } from "next/server";
import { checkAdmin, isAdminError, adminErrorResponse } from "@/lib/auth/check-admin";
import { videoLimitService } from "@/features/studio/services/video-limit-service";
import { AdminSettingsSchema } from "@/lib/validations/admin-settings";
import { pptLimitService } from "@/features/studio/services/ppt-limit-service";

async function getSettings() {
  const [limits, config, dailyPptLimit] = await Promise.all([
    videoLimitService.getGlobalLimits(),
    videoLimitService.getVideoGenerationConfig(),
    pptLimitService.getGlobalLimit(),
  ]);
  return {
    ...limits,
    videoFastProvider: config.providers.fast,
    videoQualityProvider: config.providers.quality,
    dailyPptLimit,
    creditCostVideoFast: config.creditCosts.videoFast,
    creditCostVideoQuality: config.creditCosts.videoQuality,
    creditCostImage: config.creditCosts.image,
    creditCostPptPage: config.creditCosts.pptPage,
  };
}

export async function GET() {
  const authCheck = await checkAdmin();
  if (isAdminError(authCheck)) {
    return adminErrorResponse(authCheck);
  }

  try {
    return NextResponse.json({ success: true, data: await getSettings() });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const authCheck = await checkAdmin();
  if (isAdminError(authCheck)) {
    return adminErrorResponse(authCheck);
  }

  try {
    const parsed = AdminSettingsSchema.safeParse(await request.json());
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return NextResponse.json(
        { error: `${issue.path.join(".") || "配置"}: ${issue.message}` },
        { status: 400 }
      );
    }
    const {
      dailyFastVideoLimit,
      dailyQualityVideoLimit,
      dailyPptLimit,
      videoFastProvider,
      videoQualityProvider,
      creditCostVideoFast,
      creditCostVideoQuality,
      creditCostImage,
      creditCostPptPage,
    } = parsed.data;

    // 更新视频限额
    if (dailyFastVideoLimit !== undefined || dailyQualityVideoLimit !== undefined) {
      await videoLimitService.updateGlobalLimits(
        { dailyFastVideoLimit, dailyQualityVideoLimit },
        authCheck.userId
      );
    }

    // 更新供应商设置
    if (videoFastProvider !== undefined || videoQualityProvider !== undefined) {
      await videoLimitService.updateProviderSettings(
        { videoFastProvider, videoQualityProvider },
        authCheck.userId
      );
    }

    // 更新 PPT 每日限额
    if (dailyPptLimit !== undefined) {
      await pptLimitService.updateGlobalLimit(dailyPptLimit, authCheck.userId);
    }

    // 更新积分消耗配置
    if (
      creditCostVideoFast !== undefined ||
      creditCostVideoQuality !== undefined ||
      creditCostImage !== undefined ||
      creditCostPptPage !== undefined
    ) {
      await videoLimitService.updateCreditCosts(
        {
          videoFast: creditCostVideoFast,
          videoQuality: creditCostVideoQuality,
          image: creditCostImage,
          pptPage: creditCostPptPage,
        },
        authCheck.userId
      );
    }

    return NextResponse.json({ success: true, data: await getSettings() });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
