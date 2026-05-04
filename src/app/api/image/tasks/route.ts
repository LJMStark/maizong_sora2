import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
import { imageTaskService } from "@/features/studio/services/image-task-service";
import { sanitizeError } from "@/lib/security/error-handler";

export async function GET() {
  const session = await getServerSession();

  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  try {
    const tasks = await imageTaskService.getUserTasks(session.user.id);

    return NextResponse.json({
      success: true,
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
  } catch (error) {
    return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
  }
}
