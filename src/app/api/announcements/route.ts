import { NextResponse } from "next/server";
import { db } from "@/db";
import { announcement } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { sanitizeError } from "@/lib/security/error-handler";

export async function GET() {
  try {
    const announcements = await db
      .select()
      .from(announcement)
      .where(eq(announcement.isActive, true))
      .orderBy(desc(announcement.sortOrder), desc(announcement.createdAt));

    return NextResponse.json({ success: true, data: announcements });
  } catch (error) {
    return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
  }
}
