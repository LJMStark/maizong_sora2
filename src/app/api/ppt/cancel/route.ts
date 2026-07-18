import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-session";
import { pptTaskService } from "@/features/studio/services/ppt-task-service";
import { pptPipelineService } from "@/features/studio/services/ppt-pipeline-service";
import { PptCancelSchema } from "@/lib/validations/schemas";
import { studioRouteErrorResponse } from "@/lib/api/studio-route-error";

export async function POST(request: NextRequest) {
  const session = await getServerSession();

  if (!session?.user) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validation = PptCancelSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }
    const { taskId } = validation.data;

    const task = await pptTaskService.getTaskById(taskId);
    if (!task || task.userId !== session.user.id) {
      return NextResponse.json({ error: "任务未找到" }, { status: 404 });
    }

    const result = await pptPipelineService.cancelTask(taskId);
    if (!result.cancelled) {
      return NextResponse.json(
        { error: "任务已结束，无法取消" },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      status: "cancelled",
      refundedAmount: result.refundedAmount,
    });
  } catch (error) {
    return studioRouteErrorResponse(error);
  }
}
