import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authCheck = await checkAdmin();
  if ("error" in authCheck) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  const { id } = await params;

  try {
    const userResult = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        dailyFastVideoLimit: user.dailyFastVideoLimit,
        dailyQualityVideoLimit: user.dailyQualityVideoLimit,
      })
      .from(user)
      .where(eq(user.id, id))
      .limit(1);

    if (userResult.length === 0) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: userResult[0],
    });
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
  if ("error" in authCheck) {
    return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const { dailyFastVideoLimit, dailyQualityVideoLimit } = body;

    // 验证输入（允许 null 表示恢复使用全局值）
    if (dailyFastVideoLimit !== undefined && dailyFastVideoLimit !== null) {
      if (typeof dailyFastVideoLimit !== "number" || dailyFastVideoLimit < -1) {
        return NextResponse.json(
          { error: "dailyFastVideoLimit 必须是 null 或 >= -1 的整数" },
          { status: 400 }
        );
      }
    }

    if (dailyQualityVideoLimit !== undefined && dailyQualityVideoLimit !== null) {
      if (typeof dailyQualityVideoLimit !== "number" || dailyQualityVideoLimit < -1) {
        return NextResponse.json(
          { error: "dailyQualityVideoLimit 必须是 null 或 >= -1 的整数" },
          { status: 400 }
        );
      }
    }

    // 检查用户是否存在
    const existingUser = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.id, id))
      .limit(1);

    if (existingUser.length === 0) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    // 构建更新对象
    const updateData: {
      dailyFastVideoLimit?: number | null;
      dailyQualityVideoLimit?: number | null;
    } = {};

    if (dailyFastVideoLimit !== undefined) {
      updateData.dailyFastVideoLimit = dailyFastVideoLimit;
    }

    if (dailyQualityVideoLimit !== undefined) {
      updateData.dailyQualityVideoLimit = dailyQualityVideoLimit;
    }

    // 更新用户
    await db.update(user).set(updateData).where(eq(user.id, id));

    // 返回更新后的数据
    const updatedUser = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        dailyFastVideoLimit: user.dailyFastVideoLimit,
        dailyQualityVideoLimit: user.dailyQualityVideoLimit,
      })
      .from(user)
      .where(eq(user.id, id))
      .limit(1);

    return NextResponse.json({
      success: true,
      data: updatedUser[0],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
