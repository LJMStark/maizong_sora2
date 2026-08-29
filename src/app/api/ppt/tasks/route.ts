import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
import { pptTaskService } from "@/features/studio/services/ppt-task-service";
import { sanitizeError } from "@/lib/security/error-handler";
import { storageService } from "@/features/studio/services/storage-service";

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

    // 私有 bucket：库里存的是路径，输出前批量签发限时链接
    const coverUrls = await storageService.resolveAssetUrls(
      tasks.map((t) => coverByTask.get(t.id) ?? null)
    );

    return NextResponse.json({
      tasks: tasks.map((task, index) => ({
        taskId: task.id,
        sessionId: task.sessionId,
        title: task.title,
        status: task.status,
        skillKey: task.skillKey,
        styleKey: task.styleKey,
        pageCount: task.pageCount,
        coverImageUrl: coverUrls[index],
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
