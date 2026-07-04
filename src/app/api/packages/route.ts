import { NextResponse } from "next/server";
import { db } from "@/db";
import { creditPackage } from "@/db/schema";
import { eq } from "drizzle-orm";
import { sanitizeApiErrorMessage } from "@/lib/api/sanitize-error-message";
import { DEFAULT_CREDIT_PACKAGES } from "@/features/studio/data/default-credit-packages";

export async function GET() {
  try {
    const packages = await db
      .select()
      .from(creditPackage)
      .where(eq(creditPackage.isActive, true))
      .orderBy(creditPackage.sortOrder);

    return NextResponse.json({
      packages: packages.length > 0 ? packages : DEFAULT_CREDIT_PACKAGES,
    });
  } catch (error) {
    console.error("[Packages] Error fetching packages:", error);
    const message = sanitizeApiErrorMessage(error);
    return NextResponse.json(
      { error: `获取套餐失败：${message}` },
      { status: 500 }
    );
  }
}
