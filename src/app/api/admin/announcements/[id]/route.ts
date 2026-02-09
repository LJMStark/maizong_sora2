import { NextRequest, NextResponse } from "next/server";
import { checkAdmin, isAdminError, adminErrorResponse } from "@/lib/auth/check-admin";
import { db } from "@/db";
import { announcement } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authCheck = await checkAdmin();
  if (isAdminError(authCheck)) {
    return adminErrorResponse(authCheck);
  }

  try {
    const { id } = await params;

    const [found] = await db
      .select()
      .from(announcement)
      .where(eq(announcement.id, id))
      .limit(1);

    if (!found) {
      return NextResponse.json({ error: "公告不存在" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: found });
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authCheck = await checkAdmin();
  if (isAdminError(authCheck)) {
    return adminErrorResponse(authCheck);
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { title, content, isActive, sortOrder } = body;

    const updates: Record<string, unknown> = {};

    if (title !== undefined) {
      if (typeof title !== "string" || title.trim().length === 0) {
        return NextResponse.json({ error: "标题不能为空" }, { status: 400 });
      }
      if (title.length > 200) {
        return NextResponse.json({ error: "标题长度不能超过 200 字符" }, { status: 400 });
      }
      updates.title = title.trim();
    }

    if (content !== undefined) {
      if (typeof content !== "string" || content.trim().length === 0) {
        return NextResponse.json({ error: "内容不能为空" }, { status: 400 });
      }
      if (content.length > 5000) {
        return NextResponse.json({ error: "内容长度不能超过 5000 字符" }, { status: 400 });
      }
      updates.content = content.trim();
    }

    if (isActive !== undefined) {
      updates.isActive = Boolean(isActive);
    }

    if (sortOrder !== undefined) {
      updates.sortOrder = Number(sortOrder) || 0;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "没有需要更新的字段" }, { status: 400 });
    }

    const [updated] = await db
      .update(announcement)
      .set(updates)
      .where(eq(announcement.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "公告不存在" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authCheck = await checkAdmin();
  if (isAdminError(authCheck)) {
    return adminErrorResponse(authCheck);
  }

  try {
    const { id } = await params;

    const [deleted] = await db
      .delete(announcement)
      .where(eq(announcement.id, id))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "公告不存在" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
