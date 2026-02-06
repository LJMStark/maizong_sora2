import { NextResponse } from "next/server";
import { checkAdmin, isAdminError, adminErrorResponse } from "@/lib/auth/check-admin";
import { videoLimitService } from "@/features/studio/services/video-limit-service";

export async function GET() {
  const authCheck = await checkAdmin();
  if (isAdminError(authCheck)) {
    return adminErrorResponse(authCheck);
  }

  try {
    const limits = await videoLimitService.getGlobalLimits();
    return NextResponse.json({ success: true, data: limits });
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
    const { dailyFastVideoLimit, dailyQualityVideoLimit } = body;

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

    await videoLimitService.updateGlobalLimits(
      { dailyFastVideoLimit, dailyQualityVideoLimit },
      authCheck.userId
    );

    const updatedLimits = await videoLimitService.getGlobalLimits();
    return NextResponse.json({ success: true, data: updatedLimits });
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
