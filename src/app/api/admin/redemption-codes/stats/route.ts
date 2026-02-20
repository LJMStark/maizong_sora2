import { NextResponse } from "next/server";
import { checkAdmin, isAdminError, adminErrorResponse } from "@/lib/auth/check-admin";
import { db } from "@/db";
import { redemptionCode } from "@/db/schema";
import { sql, eq, gte, and } from "drizzle-orm";

export async function GET() {
  const authCheck = await checkAdmin();
  if (isAdminError(authCheck)) {
    return adminErrorResponse(authCheck);
  }

  try {
    // Get counts by status
    const statusCounts = await db
      .select({
        status: redemptionCode.status,
        count: sql<number>`count(*)`,
        totalCredits: sql<number>`sum(${redemptionCode.credits})`,
      })
      .from(redemptionCode)
      .groupBy(redemptionCode.status);

    // Calculate totals
    const stats = {
      active: { count: 0, credits: 0 },
      used: { count: 0, credits: 0 },
      expired: { count: 0, credits: 0 },
      disabled: { count: 0, credits: 0 },
      total: { count: 0, credits: 0 },
    };

    for (const row of statusCounts) {
      const status = row.status as keyof typeof stats;
      if (status in stats) {
        stats[status].count = Number(row.count);
        stats[status].credits = Number(row.totalCredits) || 0;
        stats.total.count += Number(row.count);
        stats.total.credits += Number(row.totalCredits) || 0;
      }
    }

    // Get last 7 days trend (used codes per day)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const dailyUsage = await db
      .select({
        date: sql<string>`date(${redemptionCode.usedAt})`,
        count: sql<number>`count(*)`,
        credits: sql<number>`sum(${redemptionCode.credits})`,
      })
      .from(redemptionCode)
      .where(
        and(
          eq(redemptionCode.status, "used"),
          gte(redemptionCode.usedAt, sevenDaysAgo)
        )
      )
      .groupBy(sql`date(${redemptionCode.usedAt})`)
      .orderBy(sql`date(${redemptionCode.usedAt})`);

    // Fill in missing days
    const trend: Array<{ date: string; count: number; credits: number }> = [];
    const usageMap = new Map(
      dailyUsage.map((d) => [d.date, { count: Number(d.count), credits: Number(d.credits) || 0 }])
    );

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const usage = usageMap.get(dateStr) || { count: 0, credits: 0 };
      trend.push({ date: dateStr, ...usage });
    }

    return NextResponse.json({
      success: true,
      data: {
        stats,
        trend,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
