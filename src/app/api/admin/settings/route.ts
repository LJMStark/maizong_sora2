import { NextResponse } from "next/server";
import { checkAdmin, isAdminError, adminErrorResponse } from "@/lib/auth/check-admin";
import { videoLimitService } from "@/features/studio/services/video-limit-service";

export async function GET() {
  const authCheck = await checkAdmin();
  if (isAdminError(authCheck)) {
    return adminErrorResponse(authCheck);
  }

  try {
    const [limits, providers] = await Promise.all([
      videoLimitService.getGlobalLimits(),
      videoLimitService.getProviderSettings(),
    ]);
    return NextResponse.json({ success: true, data: { ...limits, ...providers } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
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
    const { dailyFastVideoLimit, dailyQualityVideoLimit, kieEnabled, duomiEnabled } = body;

    // 验证输入
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

    // 更新视频限额
    if (dailyFastVideoLimit !== undefined || dailyQualityVideoLimit !== undefined) {
      await videoLimitService.updateGlobalLimits(
        { dailyFastVideoLimit, dailyQualityVideoLimit },
        authCheck.userId
      );
    }

    // 更新供应商设置
    if (kieEnabled !== undefined || duomiEnabled !== undefined) {
      await videoLimitService.updateProviderSettings(
        { kieEnabled, duomiEnabled },
        authCheck.userId
      );
    }

    const [updatedLimits, updatedProviders] = await Promise.all([
      videoLimitService.getGlobalLimits(),
      videoLimitService.getProviderSettings(),
    ]);
    return NextResponse.json({ success: true, data: { ...updatedLimits, ...updatedProviders } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
