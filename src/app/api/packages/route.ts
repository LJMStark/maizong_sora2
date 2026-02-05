import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { creditPackage } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const packages = await db
      .select()
      .from(creditPackage)
      .where(eq(creditPackage.isActive, true))
      .orderBy(creditPackage.sortOrder);

    return NextResponse.json({ packages });
  } catch (error) {
    console.error("[Packages] Error fetching packages:", error);
    return NextResponse.json(
      { error: "Failed to fetch packages" },
      { status: 500 }
    );
  }
}
