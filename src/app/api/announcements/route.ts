import { NextResponse } from "next/server";
import { db } from "@/db";
import { announcement } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  try {
    const announcements = await db
      .select()
      .from(announcement)
      .where(eq(announcement.isActive, true))
      .orderBy(desc(announcement.sortOrder), desc(announcement.createdAt));

    return NextResponse.json({ success: true, data: announcements });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
