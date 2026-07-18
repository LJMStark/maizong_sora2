import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
import { pptTaskService } from "@/features/studio/services/ppt-task-service";
import { sanitizeError } from "@/lib/security/error-handler";

export async function GET() {
  const session = await getServerSession();

  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  try {
    const tasks = await pptTaskService.getUserTasks(session.user.id, 20);
    const covers = await pptTaskService.getSucceededSlidesForTasks(
      tasks.map((t) => t.id)
    );

    // 每个任务取页序最小的成功页作为封面
    const coverByTask = new Map<string, string>();
    for (const slide of covers) {
      if (!coverByTask.has(slide.taskId) && slide.finalImageUrl) {
        coverByTask.set(slide.taskId, slide.finalImageUrl);
      }
    }

    return NextResponse.json({
      tasks: tasks.map((task) => ({
        taskId: task.id,
        sessionId: task.sessionId,
        title: task.title,
        status: task.status,
        skillKey: task.skillKey,
        styleKey: task.styleKey,
        pageCount: task.pageCount,
        coverImageUrl: coverByTask.get(task.id) ?? null,
        creditCostTotal: task.creditCostTotal,
        refundedCredits: task.refundedCredits,
        createdAt: task.createdAt,
        completedAt: task.completedAt,
      })),
    });
  } catch (error) {
    return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
  }
}
