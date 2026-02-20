import { NextRequest, NextResponse } from "next/server";
import { checkAdmin, isAdminError, adminErrorResponse } from "@/lib/auth/check-admin";
import { db } from "@/db";
import { redemptionCode } from "@/db/schema";
import { eq, desc, sql, and } from "drizzle-orm";
import { generateRedemptionCode } from "@/lib/redemption-code";

// 生成唯一兑换码
async function generateUniqueCode(): Promise<string> {
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const code = generateRedemptionCode();

    const existing = await db
      .select({ id: redemptionCode.id })
      .from(redemptionCode)
      .where(eq(redemptionCode.code, code))
      .limit(1);

    if (existing.length === 0) {
      return code;
    }

    attempts++;
  }

  throw new Error("无法生成唯一兑换码，请重试");
}

// POST: 生成兑换码
export async function POST(request: NextRequest) {
  const authCheck = await checkAdmin();
  if (isAdminError(authCheck)) {
    return adminErrorResponse(authCheck);
  }

  try {
    const body = await request.json();
    const { credits, count = 1, expiresAt, note } = body;

    // 验证积分数量
    if (typeof credits !== "number" || credits < 1 || credits > 10000) {
      return NextResponse.json(
        { error: "积分数量必须在 1-10000 之间" },
        { status: 400 }
      );
    }

    // 验证生成数量
    if (typeof count !== "number" || count < 1 || count > 100) {
      return NextResponse.json(
        { error: "生成数量必须在 1-100 之间" },
        { status: 400 }
      );
    }

    // 验证过期时间
    let parsedExpiresAt: Date | null = null;
    if (expiresAt) {
      parsedExpiresAt = new Date(expiresAt);
      if (isNaN(parsedExpiresAt.getTime()) || parsedExpiresAt <= new Date()) {
        return NextResponse.json(
          { error: "过期时间必须大于当前时间" },
          { status: 400 }
        );
      }
    }

    // 验证备注长度
    if (note && note.length > 200) {
      return NextResponse.json(
        { error: "备注长度不能超过 200 字符" },
        { status: 400 }
      );
    }

    // 生成兑换码
    const codes: string[] = [];
    const records = [];

    for (let i = 0; i < count; i++) {
      const code = await generateUniqueCode();
      codes.push(code);
      records.push({
        id: crypto.randomUUID(),
        code,
        credits,
        status: "active" as const,
        expiresAt: parsedExpiresAt,
        createdBy: authCheck.userId,
        note: note || null,
      });
    }

    // 批量插入
    await db.insert(redemptionCode).values(records);

    return NextResponse.json({
      success: true,
      codes,
      count: codes.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET: 查询兑换码列表
export async function GET(request: NextRequest) {
  const authCheck = await checkAdmin();
  if (isAdminError(authCheck)) {
    return adminErrorResponse(authCheck);
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "all";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const offset = (page - 1) * limit;

    // 构建查询条件
    const conditions = [];
    if (status !== "all") {
      conditions.push(eq(redemptionCode.status, status as "active" | "used" | "expired" | "disabled"));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // 查询数据
    const [codes, countResult] = await Promise.all([
      db
        .select()
        .from(redemptionCode)
        .where(whereClause)
        .orderBy(desc(redemptionCode.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(redemptionCode)
        .where(whereClause),
    ]);

    const total = Number(countResult[0]?.count || 0);

    return NextResponse.json({
      success: true,
      data: {
        codes,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
