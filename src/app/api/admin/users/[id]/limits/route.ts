import { NextRequest, NextResponse } from "next/server";
import { checkAdmin, isAdminError, adminErrorResponse } from "@/lib/auth/check-admin";
import { db } from "@/db";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";

const USER_LIMIT_FIELDS = {
  id: user.id,
  name: user.name,
  email: user.email,
  dailyFastVideoLimit: user.dailyFastVideoLimit,
  dailyQualityVideoLimit: user.dailyQualityVideoLimit,
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authCheck = await checkAdmin();
  if (isAdminError(authCheck)) {
    return adminErrorResponse(authCheck);
  }

  const { id } = await params;

  try {
    const userResult = await db
      .select(USER_LIMIT_FIELDS)
      .from(user)
      .where(eq(user.id, id))
      .limit(1);

    if (userResult.length === 0) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: userResult[0] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authCheck = await checkAdmin();
  if (isAdminError(authCheck)) {
    return adminErrorResponse(authCheck);
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const { dailyFastVideoLimit, dailyQualityVideoLimit } = body;

    // 验证输入（允许 null 表示恢复使用全局值）
    for (const [key, value] of Object.entries({ dailyFastVideoLimit, dailyQualityVideoLimit })) {
      if (value !== undefined && value !== null) {
        if (typeof value !== "number" || value < -1) {
          return NextResponse.json(
            { error: `${key} 必须是 null 或 >= -1 的整数` },
            { status: 400 }
          );
        }
      }
    }

    // 更新用户并返回结果
    const updateData: Record<string, number | null> = {};
    if (dailyFastVideoLimit !== undefined) updateData.dailyFastVideoLimit = dailyFastVideoLimit;
    if (dailyQualityVideoLimit !== undefined) updateData.dailyQualityVideoLimit = dailyQualityVideoLimit;

    const updatedUser = await db
      .update(user)
      .set(updateData)
      .where(eq(user.id, id))
      .returning(USER_LIMIT_FIELDS);

    if (updatedUser.length === 0) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updatedUser[0] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
