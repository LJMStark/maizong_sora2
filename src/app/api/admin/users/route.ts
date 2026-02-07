import { NextRequest, NextResponse } from "next/server";
import { checkAdmin, isAdminError, adminErrorResponse } from "@/lib/auth/check-admin";
import { db } from "@/db";
import { user } from "@/db/schema";
import { desc, sql, ilike, or, eq } from "drizzle-orm";

const USER_LIST_FIELDS = {
  id: user.id,
  name: user.name,
  username: user.username,
  email: user.email,
  image: user.image,
  role: user.role,
  credits: user.credits,
  dailyFastVideoLimit: user.dailyFastVideoLimit,
  dailyQualityVideoLimit: user.dailyQualityVideoLimit,
  createdAt: user.createdAt,
};

export async function GET(request: NextRequest) {
  const authCheck = await checkAdmin();
  if (isAdminError(authCheck)) {
    return adminErrorResponse(authCheck);
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const offset = (page - 1) * limit;
    const search = searchParams.get("search")?.trim() || "";
    const role = searchParams.get("role") || "";

    // Build where conditions
    const conditions = [];

    if (search) {
      conditions.push(
        or(
          ilike(user.name, `%${search}%`),
          ilike(user.email, `%${search}%`),
          ilike(user.username, `%${search}%`)
        )
      );
    }

    if (role && role !== "all") {
      conditions.push(eq(user.role, role));
    }

    // Combine conditions with AND
    let whereClause;
    if (conditions.length === 0) {
      whereClause = undefined;
    } else if (conditions.length === 1) {
      whereClause = conditions[0];
    } else {
      whereClause = sql`${conditions[0]} AND ${conditions[1]}`;
    }

    // Query data
    const [users, countResult] = await Promise.all([
      db
        .select(USER_LIST_FIELDS)
        .from(user)
        .where(whereClause)
        .orderBy(desc(user.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(user)
        .where(whereClause),
    ]);

    const total = Number(countResult[0]?.count || 0);

    return NextResponse.json({
      success: true,
      data: {
        users,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
