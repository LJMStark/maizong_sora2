import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
import { videoLimitService } from "@/features/studio/services/video-limit-service";
import { db } from "@/db";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";

async function checkAdmin() {
  const session = await getServerSession();

  if (!session?.user?.id) {
    return { error: "未授权", status: 401 };
  }

  const userResult = await db
    .select({ role: user.role })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);

  if (userResult.length === 0 || userResult[0].role !== "admin") {
    return { error: "需要管理员权限", status: 403 };
  }

  return { userId: session.user.id };
}

export async function GET() {
  const authCheck = await checkAdmin();
  if ("error" in authCheck) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  try {
    const limits = await videoLimitService.getGlobalLimits();

    return NextResponse.json({
      success: true,
      data: limits,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const authCheck = await checkAdmin();
  if ("error" in authCheck) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
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

    return NextResponse.json({
      success: true,
      data: updatedLimits,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
