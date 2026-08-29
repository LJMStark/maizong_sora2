import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
import { imageTaskService } from "@/features/studio/services/image-task-service";
import { sanitizeError } from "@/lib/security/error-handler";
import { storageService } from "@/features/studio/services/storage-service";

export async function GET() {
  const session = await getServerSession();

  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  try {
    const tasks = await imageTaskService.getUserTasks(session.user.id);

    // 私有 bucket：库里存的是路径，输出前批量签发限时链接
    const [sourceUrls, imageUrls] = await Promise.all([
      storageService.resolveAssetUrls(tasks.map((t) => t.sourceImageUrl)),
      storageService.resolveAssetUrls(tasks.map((t) => t.finalImageUrl)),
    ]);

    return NextResponse.json({
      success: true,
      tasks: tasks.map((task, index) => ({
        id: task.id,
        sessionId: task.sessionId,
        mode: task.mode,
        model: task.model,
        prompt: task.prompt,
        aspectRatio: task.aspectRatio,
        status: task.status,
        errorMessage: task.errorMessage,
        sourceImageUrl: sourceUrls[index],
        imageUrl: imageUrls[index],
        creditCost: task.creditCost,
        createdAt: task.createdAt,
        completedAt: task.completedAt,
      })),
    });
  } catch (error) {
    return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
  }
}
