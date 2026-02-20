import { NextRequest, NextResponse } from "next/server";
import { checkAdmin, isAdminError, adminErrorResponse } from "@/lib/auth/check-admin";
import { db } from "@/db";
import { redemptionCode } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(request: NextRequest) {
  const authCheck = await checkAdmin();
  if (isAdminError(authCheck)) {
    return adminErrorResponse(authCheck);
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "";

    // Build query
    const whereClause = status && status !== "all"
      ? eq(redemptionCode.status, status as "active" | "used" | "expired" | "disabled")
      : undefined;

    const codes = await db
      .select()
      .from(redemptionCode)
      .where(whereClause)
      .orderBy(desc(redemptionCode.createdAt));

    // Generate CSV content
    const headers = [
      "兑换码",
      "积分",
      "状态",
      "过期时间",
      "使用者ID",
      "使用时间",
      "创建者ID",
      "创建时间",
      "备注",
    ];

    const rows = codes.map((code) => [
      code.code,
      code.credits.toString(),
      code.status,
      code.expiresAt ? code.expiresAt.toISOString() : "",
      code.usedBy || "",
      code.usedAt ? code.usedAt.toISOString() : "",
      code.createdBy,
      code.createdAt.toISOString(),
      code.note || "",
    ]);

    const csvContent = [
      headers.map(escapeCSV).join(","),
      ...rows.map((row) => row.map(escapeCSV).join(",")),
    ].join("\n");

    // Add BOM for Excel compatibility with Chinese characters
    const bom = "\uFEFF";
    const csvWithBom = bom + csvContent;

    const filename = `redemption-codes-${new Date().toISOString().split("T")[0]}.csv`;

    return new NextResponse(csvWithBom, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
