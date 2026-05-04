import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
import {
  studioSessionService,
  StudioSessionKind,
} from "@/features/studio/services/studio-session-service";
import { imageTaskService } from "@/features/studio/services/image-task-service";
import { videoTaskService } from "@/features/studio/services/video-task-service";
import { sanitizeError } from "@/lib/security/error-handler";

function parseType(value: string | null): StudioSessionKind | undefined {
  if (value === "image" || value === "video") return value;
  return undefined;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authSession = await getServerSession();

  if (!authSession?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const rawType = searchParams.get("type");
  const requestedType = parseType(rawType);

  if (rawType && !requestedType) {
    return NextResponse.json({ error: "无效的会话类型" }, { status: 400 });
  }

  try {
    const studioSession = await studioSessionService.getSessionById({
      userId: authSession.user.id,
      sessionId: id,
      type: requestedType,
    });

    if (!studioSession) {
      return NextResponse.json({ error: "会话不存在" }, { status: 404 });
    }

    if (studioSession.type === "image") {
      const tasks = await imageTaskService.getUserTasksBySession(
        authSession.user.id,
        studioSession.id
      );

      return NextResponse.json({
        success: true,
        session: {
          id: studioSession.id,
          type: studioSession.type,
          title: studioSession.title,
          createdAt: studioSession.createdAt,
          updatedAt: studioSession.updatedAt,
        },
        tasks: tasks.map((task) => ({
          id: task.id,
          sessionId: task.sessionId,
          mode: task.mode,
          model: task.model,
          prompt: task.prompt,
          aspectRatio: task.aspectRatio,
          status: task.status,
          errorMessage: task.errorMessage,
          sourceImageUrl: task.sourceImageUrl,
          imageUrl: task.finalImageUrl,
          creditCost: task.creditCost,
          createdAt: task.createdAt,
          completedAt: task.completedAt,
        })),
      });
    }

    const tasks = await videoTaskService.getUserTasksBySession(
      authSession.user.id,
      studioSession.id
    );

    return NextResponse.json({
      success: true,
      session: {
        id: studioSession.id,
        type: studioSession.type,
        title: studioSession.title,
        createdAt: studioSession.createdAt,
        updatedAt: studioSession.updatedAt,
      },
      tasks: tasks.map((task) => ({
        id: task.id,
        sessionId: task.sessionId,
        status: task.status,
        progress: task.progress,
        prompt: task.prompt,
        aspectRatio: task.aspectRatio,
        duration: task.duration,
        model: task.model,
        videoUrl: task.finalVideoUrl || task.duomiVideoUrl,
        sourceImageUrl: task.sourceImageUrl,
        errorMessage: task.errorMessage,
        creditCost: task.creditCost,
        createdAt: task.createdAt,
        completedAt: task.completedAt,
      })),
    });
  } catch (error) {
    return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
  }
}
