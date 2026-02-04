import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
import { videoTaskService } from "@/features/studio/services/video-task-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const session = await getServerSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { taskId } = await params;

  try {
    const task = await videoTaskService.getTaskById(taskId);

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (task.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
