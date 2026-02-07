import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
import { db } from "@/db";
import { redemptionCode, creditTransaction, user } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { formatRedemptionCode, validateCodeFormat } from "@/lib/redemption-code";
import { rateLimiter } from "@/lib/rate-limit";

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_FORMAT: "兑换码格式不正确，请输入 XXXX-XXXX-XXXX 格式",
  NOT_FOUND: "兑换码不存在，请检查后重试",
  ALREADY_USED: "此兑换码已被使用",
  EXPIRED: "兑换码已过期",
  DISABLED: "兑换码已被禁用",
  SYSTEM_ERROR: "系统错误，请稍后重试",
};

export async function POST(request: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  const userId = session.user.id;

  // Rate limit: 5 requests per minute for redeem
  const { success } = await rateLimiter.limit(userId, "redeem");
  if (!success) {
    return NextResponse.json({ error: "请求过于频繁，请稍后重试" }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { code } = body;

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { success: false, error: ERROR_MESSAGES.INVALID_FORMAT },
        { status: 400 }
      );
    }

    const formattedCode = formatRedemptionCode(code);

    if (!validateCodeFormat(formattedCode)) {
      return NextResponse.json(
        { success: false, error: ERROR_MESSAGES.INVALID_FORMAT },
        { status: 400 }
      );
    }

    const result = await db.transaction(async (tx) => {
      // 1. 查找兑换码
      const codeRecords = await tx
        .select()
        .from(redemptionCode)
        .where(eq(redemptionCode.code, formattedCode))
        .limit(1);

      if (codeRecords.length === 0) {
        throw new Error("NOT_FOUND");
      }

      const codeRecord = codeRecords[0];

      // 2. 验证状态
      switch (codeRecord.status) {
        case "used":
          throw new Error("ALREADY_USED");
        case "disabled":
          throw new Error("DISABLED");
        case "expired":
          throw new Error("EXPIRED");
      }

      if (codeRecord.expiresAt && codeRecord.expiresAt < new Date()) {
        // 更新状态为已过期
        await tx
          .update(redemptionCode)
          .set({ status: "expired" })
          .where(eq(redemptionCode.id, codeRecord.id));
        throw new Error("EXPIRED");
      }

      // 3. 获取用户当前积分
      const userRecords = await tx
        .select({ credits: user.credits })
        .from(user)
        .where(eq(user.id, session.user.id))
        .limit(1);

      if (userRecords.length === 0) {
        throw new Error("SYSTEM_ERROR");
      }

      const currentCredits = userRecords[0].credits;
      const newCredits = currentCredits + codeRecord.credits;

      // 4. 更新用户积分
      await tx
        .update(user)
        .set({ credits: sql`${user.credits} + ${codeRecord.credits}` })
        .where(eq(user.id, session.user.id));

      // 5. 标记兑换码为已使用
      await tx
        .update(redemptionCode)
        .set({
          status: "used",
          usedBy: session.user.id,
          usedAt: new Date(),
        })
        .where(eq(redemptionCode.id, codeRecord.id));

      // 6. 记录积分交易
      await tx.insert(creditTransaction).values({
        id: crypto.randomUUID(),
        userId: session.user.id,
        type: "addition",
        amount: codeRecord.credits,
        balanceBefore: currentCredits,
        balanceAfter: newCredits,
        reason: `兑换码：${codeRecord.code}`,
        referenceType: "redemption_code",
        referenceId: codeRecord.id,
      });

      return { credits: codeRecord.credits, newBalance: newCredits };
    });

    return NextResponse.json({
      success: true,
      credits: result.credits,
      newBalance: result.newBalance,
    });
  } catch (error) {
    const errorCode = error instanceof Error ? error.message : "SYSTEM_ERROR";
    const errorMessage = ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.SYSTEM_ERROR;

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 400 }
    );
  }
}
