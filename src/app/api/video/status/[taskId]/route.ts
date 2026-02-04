import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
import { videoTaskService } from "@/features/studio/services/video-task-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const session = await getServerSession();

  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  const { taskId } = await params;

  try {
    const task = await videoTaskService.getTaskById(taskId);

    if (!task) {
      return NextResponse.json({ error: "任务未找到" }, { status: 404 });
    }

    if (task.userId !== session.user.id) {
      return NextResponse.json({ error: "禁止访问" }, { status: 403 });
    }

    // Return current state from database (updated via callback)
    return NextResponse.json({
      id: task.id,
      status: task.status,
      progress: task.status === "succeeded" ? 100 : task.progress,
      videoUrl: task.finalVideoUrl || task.duomiVideoUrl,
      errorMessage: task.errorMessage,
      prompt: task.prompt,
      createdAt: task.createdAt,
      completedAt: task.completedAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
