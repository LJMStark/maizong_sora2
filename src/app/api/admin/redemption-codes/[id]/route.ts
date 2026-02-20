import { NextRequest, NextResponse } from "next/server";
import { checkAdmin, isAdminError, adminErrorResponse } from "@/lib/auth/check-admin";
import { db } from "@/db";
import { redemptionCode } from "@/db/schema";
import { eq } from "drizzle-orm";

// PATCH: 禁用兑换码
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
    const { status } = body;

    // 只允许禁用操作
    if (status !== "disabled") {
      return NextResponse.json(
        { error: "只能将兑换码状态设置为 disabled" },
        { status: 400 }
      );
    }

    // 查找兑换码
    const existing = await db
      .select()
      .from(redemptionCode)
      .where(eq(redemptionCode.id, id))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: "兑换码不存在" }, { status: 404 });
    }

    // 已使用的兑换码不能禁用
    if (existing[0].status === "used") {
      return NextResponse.json(
        { error: "已使用的兑换码不能禁用" },
        { status: 400 }
      );
    }

    // 更新状态
    await db
      .update(redemptionCode)
      .set({ status: "disabled" })
      .where(eq(redemptionCode.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
