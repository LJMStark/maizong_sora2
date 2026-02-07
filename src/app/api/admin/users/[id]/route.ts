import { NextRequest, NextResponse } from "next/server";
import { checkAdmin, isAdminError, adminErrorResponse } from "@/lib/auth/check-admin";
import { db } from "@/db";
import { user, creditTransaction } from "@/db/schema";
import { eq } from "drizzle-orm";

const USER_DETAIL_FIELDS = {
  id: user.id,
  name: user.name,
  username: user.username,
  displayUsername: user.displayUsername,
  email: user.email,
  emailVerified: user.emailVerified,
  image: user.image,
  role: user.role,
  gender: user.gender,
  credits: user.credits,
  dailyFastVideoLimit: user.dailyFastVideoLimit,
  dailyQualityVideoLimit: user.dailyQualityVideoLimit,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
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
      .select(USER_DETAIL_FIELDS)
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
    const { role, credits, dailyFastVideoLimit, dailyQualityVideoLimit } = body;

    // Validate role
    const validRoles = ["member", "admin", "disabled"];
    if (role !== undefined && !validRoles.includes(role)) {
      return NextResponse.json(
        { error: `角色必须是 ${validRoles.join(", ")} 之一` },
        { status: 400 }
      );
    }

    // Prevent admin from disabling themselves
    if (role === "disabled" && id === authCheck.userId) {
      return NextResponse.json(
        { error: "不能禁用自己的账户" },
        { status: 400 }
      );
    }

    // Validate credits
    if (credits !== undefined) {
      if (typeof credits !== "number" || credits < 0 || !Number.isInteger(credits)) {
        return NextResponse.json(
          { error: "积分必须是非负整数" },
          { status: 400 }
        );
      }
    }

    // Validate video limits
    const videoLimits = [
      { name: "dailyFastVideoLimit", value: dailyFastVideoLimit },
      { name: "dailyQualityVideoLimit", value: dailyQualityVideoLimit },
    ];

    for (const { name, value } of videoLimits) {
      if (value === undefined || value === null) continue;
      if (typeof value !== "number" || value < -1 || !Number.isInteger(value)) {
        return NextResponse.json(
          { error: `${name} 必须是 null 或 >= -1 的整数` },
          { status: 400 }
        );
      }
    }

    // Get current user data for credit transaction
    const currentUser = await db
      .select({ credits: user.credits })
      .from(user)
      .where(eq(user.id, id))
      .limit(1);

    if (currentUser.length === 0) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    const currentCredits = currentUser[0].credits;

    // Build update data
    const updateData: Record<string, string | number | null> = {};
    if (role !== undefined) updateData.role = role;
    if (credits !== undefined) updateData.credits = credits;
    if (dailyFastVideoLimit !== undefined) updateData.dailyFastVideoLimit = dailyFastVideoLimit;
    if (dailyQualityVideoLimit !== undefined) updateData.dailyQualityVideoLimit = dailyQualityVideoLimit;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "没有提供要更新的字段" },
        { status: 400 }
      );
    }

    // Use transaction if credits are being changed
    if (credits !== undefined && credits !== currentCredits) {
      const creditDiff = credits - currentCredits;
      const transactionType = creditDiff > 0 ? "addition" : "deduction";

      await db.transaction(async (tx) => {
        // Update user
        await tx
          .update(user)
          .set(updateData)
          .where(eq(user.id, id));

        // Record credit transaction
        await tx.insert(creditTransaction).values({
          id: crypto.randomUUID(),
          userId: id,
          type: transactionType,
          amount: Math.abs(creditDiff),
          balanceBefore: currentCredits,
          balanceAfter: credits,
          reason: `管理员调整积分`,
          referenceType: "admin_adjustment",
          referenceId: authCheck.userId,
        });
      });
    } else {
      await db
        .update(user)
        .set(updateData)
        .where(eq(user.id, id));
    }

    // Fetch updated user
    const updatedUser = await db
      .select(USER_DETAIL_FIELDS)
      .from(user)
      .where(eq(user.id, id))
      .limit(1);

    return NextResponse.json({ success: true, data: updatedUser[0] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authCheck = await checkAdmin();
  if (isAdminError(authCheck)) {
    return adminErrorResponse(authCheck);
  }

  const { id } = await params;

  // Prevent admin from disabling themselves
  if (id === authCheck.userId) {
    return NextResponse.json(
      { error: "不能禁用自己的账户" },
      { status: 400 }
    );
  }

  try {
    // Check if user exists
    const userResult = await db
      .select({ id: user.id, role: user.role })
      .from(user)
      .where(eq(user.id, id))
      .limit(1);

    if (userResult.length === 0) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    if (userResult[0].role === "disabled") {
      return NextResponse.json({ error: "用户已被禁用" }, { status: 400 });
    }

    // Disable user (soft delete)
    await db
      .update(user)
      .set({ role: "disabled" })
      .where(eq(user.id, id));

    return NextResponse.json({ success: true, message: "用户已禁用" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
