import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
import { videoTaskService } from "@/features/studio/services/video-task-service";

export async function GET() {
  const session = await getServerSession();

  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  try {
    const tasks = await videoTaskService.getUserTasks(session.user.id);

    const formattedTasks = tasks.map((task) => ({
      id: task.id,
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
    }));

    return NextResponse.json({ tasks: formattedTasks });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
