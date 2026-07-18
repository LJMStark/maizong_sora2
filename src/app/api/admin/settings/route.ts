import { NextResponse } from "next/server";
import { checkAdmin, isAdminError, adminErrorResponse } from "@/lib/auth/check-admin";
import { videoLimitService } from "@/features/studio/services/video-limit-service";
import type { VideoProvider } from "@/features/studio/services/video-limit-service";
import { pptLimitService } from "@/features/studio/services/ppt-limit-service";

export async function GET() {
  const authCheck = await checkAdmin();
  if (isAdminError(authCheck)) {
    return adminErrorResponse(authCheck);
  }

  try {
    const [limits, providers, creditCosts, dailyPptLimit] = await Promise.all([
      videoLimitService.getGlobalLimits(),
      videoLimitService.getProviderSettings(),
      videoLimitService.getCreditCosts(),
      pptLimitService.getGlobalLimit(),
    ]);
    return NextResponse.json({
      success: true,
      data: {
        ...limits,
        ...providers,
        dailyPptLimit,
        creditCostVideoFast: creditCosts.videoFast,
        creditCostVideoQuality: creditCosts.videoQuality,
        creditCostImage: creditCosts.image,
        creditCostPptPage: creditCosts.pptPage,
      },
    });
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
    const body = await request.json();
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
    } = body;

    // 验证视频限额
    if (dailyFastVideoLimit !== undefined) {
      if (typeof dailyFastVideoLimit !== "number" || dailyFastVideoLimit < -1) {
        return NextResponse.json(
          { error: "dailyFastVideoLimit 必须是 >= -1 的整数" },
          { status: 400 }
        );
      }
    }

    if (dailyQualityVideoLimit !== undefined) {
      if (typeof dailyQualityVideoLimit !== "number" || dailyQualityVideoLimit < -1) {
        return NextResponse.json(
          { error: "dailyQualityVideoLimit 必须是 >= -1 的整数" },
          { status: 400 }
        );
      }
    }

    if (dailyPptLimit !== undefined) {
      if (typeof dailyPptLimit !== "number" || dailyPptLimit < -1) {
        return NextResponse.json(
          { error: "dailyPptLimit 必须是 >= -1 的整数" },
          { status: 400 }
        );
      }
    }

    // 验证供应商配置
    const validProviders: VideoProvider[] = ["kie", "duomi", "veo"];
    if (videoFastProvider !== undefined && !validProviders.includes(videoFastProvider)) {
      return NextResponse.json(
        { error: "videoFastProvider 必须是 'kie'、'duomi' 或 'veo'" },
        { status: 400 }
      );
    }
    if (videoQualityProvider !== undefined && !validProviders.includes(videoQualityProvider)) {
      return NextResponse.json(
        { error: "videoQualityProvider 必须是 'kie'、'duomi' 或 'veo'" },
        { status: 400 }
      );
    }

    // 验证积分消耗配置
    if (creditCostVideoFast !== undefined) {
      if (typeof creditCostVideoFast !== "number" || creditCostVideoFast < 0) {
        return NextResponse.json(
          { error: "creditCostVideoFast 必须是 >= 0 的整数" },
          { status: 400 }
        );
      }
    }
    if (creditCostVideoQuality !== undefined) {
      if (typeof creditCostVideoQuality !== "number" || creditCostVideoQuality < 0) {
        return NextResponse.json(
          { error: "creditCostVideoQuality 必须是 >= 0 的整数" },
          { status: 400 }
        );
      }
    }
    if (creditCostImage !== undefined) {
      if (typeof creditCostImage !== "number" || creditCostImage < 0) {
        return NextResponse.json(
          { error: "creditCostImage 必须是 >= 0 的整数" },
          { status: 400 }
        );
      }
    }
    if (creditCostPptPage !== undefined) {
      if (typeof creditCostPptPage !== "number" || creditCostPptPage < 0) {
        return NextResponse.json(
          { error: "creditCostPptPage 必须是 >= 0 的整数" },
          { status: 400 }
        );
      }
    }

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

    const [updatedLimits, updatedProviders, updatedCreditCosts, updatedPptLimit] =
      await Promise.all([
        videoLimitService.getGlobalLimits(),
        videoLimitService.getProviderSettings(),
        videoLimitService.getCreditCosts(),
        pptLimitService.getGlobalLimit(),
      ]);
    return NextResponse.json({
      success: true,
      data: {
        ...updatedLimits,
        ...updatedProviders,
        dailyPptLimit: updatedPptLimit,
        creditCostVideoFast: updatedCreditCosts.videoFast,
        creditCostVideoQuality: updatedCreditCosts.videoQuality,
        creditCostImage: updatedCreditCosts.image,
        creditCostPptPage: updatedCreditCosts.pptPage,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
