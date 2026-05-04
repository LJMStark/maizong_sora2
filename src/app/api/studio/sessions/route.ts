import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
import {
  studioSessionService,
  StudioSessionKind,
} from "@/features/studio/services/studio-session-service";
import { sanitizeError } from "@/lib/security/error-handler";

function parseType(value: string | null): StudioSessionKind | null {
  return value === "image" || value === "video" ? value : null;
}

export async function GET(request: NextRequest) {
  const session = await getServerSession();

  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = parseType(searchParams.get("type"));
  if (!type) {
    return NextResponse.json({ error: "无效的会话类型" }, { status: 400 });
  }

  try {
    const sessions = await studioSessionService.getUserSessions({
      userId: session.user.id,
      type,
      search: searchParams.get("search") ?? undefined,
    });

    return NextResponse.json({
      success: true,
      sessions: sessions.map((item) => ({
        id: item.id,
        type: item.type,
        title: item.title,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
    });
  } catch (error) {
    return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
  }
}
