import { NextRequest, NextResponse } from "next/server";
import { checkAdmin, isAdminError, adminErrorResponse } from "@/lib/auth/check-admin";
import { db } from "@/db";
import { announcement } from "@/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  const authCheck = await checkAdmin();
  if (isAdminError(authCheck)) {
    return adminErrorResponse(authCheck);
  }

  try {
    const announcements = await db
      .select()
      .from(announcement)
      .orderBy(desc(announcement.sortOrder), desc(announcement.createdAt));

    return NextResponse.json({ success: true, data: announcements });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authCheck = await checkAdmin();
  if (isAdminError(authCheck)) {
    return adminErrorResponse(authCheck);
  }

  try {
    const body = await request.json();
    const { title, content, isActive = true, sortOrder = 0 } = body;

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json(
        { error: "标题不能为空" },
        { status: 400 }
      );
    }

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json(
        { error: "内容不能为空" },
        { status: 400 }
      );
    }

    if (title.length > 200) {
      return NextResponse.json(
        { error: "标题长度不能超过 200 字符" },
        { status: 400 }
      );
    }

    if (content.length > 5000) {
      return NextResponse.json(
        { error: "内容长度不能超过 5000 字符" },
        { status: 400 }
      );
    }

    const [created] = await db
      .insert(announcement)
      .values({
        id: crypto.randomUUID(),
        title: title.trim(),
        content: content.trim(),
        isActive: Boolean(isActive),
        sortOrder: Number(sortOrder) || 0,
        createdBy: authCheck.userId,
      })
      .returning();

    return NextResponse.json({ success: true, data: created });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
