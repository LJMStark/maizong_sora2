import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
import { videoTaskService } from "@/features/studio/services/video-task-service";
import { sanitizeError } from "@/lib/security/error-handler";
import { storageService } from "@/features/studio/services/storage-service";

export async function GET() {
  const session = await getServerSession();

  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  try {
    const tasks = await videoTaskService.getUserTasks(session.user.id);

    // 私有 bucket：库里存的是路径，输出前批量签发限时链接
    const [videoUrls, sourceUrls] = await Promise.all([
      storageService.resolveAssetUrls(
        tasks.map((t) => t.finalVideoUrl || t.duomiVideoUrl)
      ),
      storageService.resolveAssetUrls(tasks.map((t) => t.sourceImageUrl)),
    ]);

    const formattedTasks = tasks.map((task, index) => ({
      id: task.id,
      sessionId: task.sessionId,
      status: task.status,
      progress: task.progress,
      prompt: task.prompt,
      aspectRatio: task.aspectRatio,
      duration: task.duration,
      model: task.model,
      videoUrl: videoUrls[index],
      sourceImageUrl: sourceUrls[index],
      errorMessage: task.errorMessage,
      creditCost: task.creditCost,
      createdAt: task.createdAt,
      completedAt: task.completedAt,
    }));

    return NextResponse.json({ tasks: formattedTasks });
  } catch (error) {
    return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
  }
}
