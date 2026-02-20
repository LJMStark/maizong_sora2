import { NextRequest, NextResponse } from "next/server";
import { checkAdmin, isAdminError, adminErrorResponse } from "@/lib/auth/check-admin";
import { db } from "@/db";
import { creditOrder, creditPackage, user } from "@/db/schema";
import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { sanitizeApiErrorMessage } from "@/lib/api/sanitize-error-message";

type OrderStatus = typeof creditOrder.$inferSelect.status;

const ALLOWED_STATUS: ReadonlySet<OrderStatus> = new Set([
  "pending",
  "paid",
  "cancelled",
]);

function parsePositiveInt(value: string | null, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return defaultValue;
  return parsed;
}

function buildWhereClause(params: {
  status: OrderStatus | null;
  keyword: string | null;
}): SQL | undefined {
  const conditions: SQL[] = [];

  if (params.status) {
    conditions.push(eq(creditOrder.status, params.status));
  }

  if (params.keyword) {
    const pattern = `%${params.keyword}%`;
    const keywordCondition = or(
      ilike(creditOrder.id, pattern),
      ilike(user.email, pattern),
      ilike(user.name, pattern)
    );
    if (keywordCondition) {
      conditions.push(keywordCondition);
    }
  }

  if (conditions.length === 0) {
    return undefined;
  }

  if (conditions.length === 1) {
    return conditions[0];
  }

  return and(...conditions);
}

export async function GET(request: NextRequest) {
  const authCheck = await checkAdmin();
  if (isAdminError(authCheck)) {
    return adminErrorResponse(authCheck);
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const keywordRaw = searchParams.get("q");
    const keyword = keywordRaw ? keywordRaw.trim() : null;
    const page = parsePositiveInt(searchParams.get("page"), 1);
    const limit = Math.min(parsePositiveInt(searchParams.get("limit"), 20), 100);
    const offset = (page - 1) * limit;

    const normalizedStatus: OrderStatus | null =
      status && ALLOWED_STATUS.has(status as OrderStatus)
        ? (status as OrderStatus)
        : null;

    if (status && !normalizedStatus) {
      return NextResponse.json(
        { error: "status 必须是 pending、paid 或 cancelled" },
        { status: 400 }
      );
    }
    const whereClause = buildWhereClause({
      status: normalizedStatus,
      keyword: keyword || null,
    });

    const rows = whereClause
      ? await db
          .select({
            id: creditOrder.id,
            userId: creditOrder.userId,
            packageId: creditOrder.packageId,
            amount: creditOrder.amount,
            status: creditOrder.status,
            remark: creditOrder.remark,
            createdAt: creditOrder.createdAt,
            paidAt: creditOrder.paidAt,
            userName: user.name,
            userEmail: user.email,
            packageName: creditPackage.name,
            packageType: creditPackage.type,
          })
          .from(creditOrder)
          .leftJoin(user, eq(user.id, creditOrder.userId))
          .leftJoin(creditPackage, eq(creditPackage.id, creditOrder.packageId))
          .where(whereClause)
          .orderBy(desc(creditOrder.createdAt))
          .limit(limit)
          .offset(offset)
      : await db
          .select({
            id: creditOrder.id,
            userId: creditOrder.userId,
            packageId: creditOrder.packageId,
            amount: creditOrder.amount,
            status: creditOrder.status,
            remark: creditOrder.remark,
            createdAt: creditOrder.createdAt,
            paidAt: creditOrder.paidAt,
            userName: user.name,
            userEmail: user.email,
            packageName: creditPackage.name,
            packageType: creditPackage.type,
          })
          .from(creditOrder)
          .leftJoin(user, eq(user.id, creditOrder.userId))
          .leftJoin(creditPackage, eq(creditPackage.id, creditOrder.packageId))
          .orderBy(desc(creditOrder.createdAt))
          .limit(limit)
          .offset(offset);

    const [countResult] = whereClause
      ? await db
          .select({
            count: sql<number>`count(*)::int`,
          })
          .from(creditOrder)
          .leftJoin(user, eq(user.id, creditOrder.userId))
          .where(whereClause)
      : await db
          .select({
            count: sql<number>`count(*)::int`,
          })
          .from(creditOrder)
          .leftJoin(user, eq(user.id, creditOrder.userId));

    const total = countResult?.count ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return NextResponse.json({
      success: true,
      data: {
        items: rows,
        page,
        limit,
        total,
        totalPages,
        status: normalizedStatus,
        q: keyword || null,
      },
    });
  } catch (error) {
    const message = sanitizeApiErrorMessage(error);
    return NextResponse.json({ error: `加载订单失败：${message}` }, { status: 500 });
  }
}
