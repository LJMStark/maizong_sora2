import { db } from "@/db";
import { videoTask, VideoTaskType } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export interface CreateVideoTaskParams {
  userId: string;
  model: "sora-2" | "sora-2-pro";
  prompt: string;
  aspectRatio: string;
  duration: number;
  sourceImageUrl?: string;
  creditCost: number;
  creditTransactionId: string;
}

export const videoTaskService = {
  async createTask(params: CreateVideoTaskParams): Promise<VideoTaskType> {
    const taskId = crypto.randomUUID();

    const [task] = await db
      .insert(videoTask)
      .values({
        id: taskId,
        userId: params.userId,
        model: params.model,
        prompt: params.prompt,
        aspectRatio: params.aspectRatio,
        duration: params.duration,
        sourceImageUrl: params.sourceImageUrl,
        creditCost: params.creditCost,
        creditTransactionId: params.creditTransactionId,
        status: "pending",
        progress: 0,
      })
      .returning();

    return task;
  },

  async updateDuomiTaskId(
    taskId: string,
    duomiTaskId: string
  ): Promise<VideoTaskType> {
    const [task] = await db
      .update(videoTask)
      .set({ duomiTaskId })
      .where(eq(videoTask.id, taskId))
      .returning();

    return task;
  },

  async updateTaskStatus(
    taskId: string,
    status: "pending" | "running" | "succeeded" | "error",
    progress?: number,
    errorMessage?: string
  ): Promise<VideoTaskType> {
    const updateData: Partial<VideoTaskType> = { status };

    if (progress !== undefined) {
      updateData.progress = progress;
    }

    if (errorMessage !== undefined) {
      updateData.errorMessage = errorMessage;
    }

    if (status === "succeeded" || status === "error") {
      updateData.completedAt = new Date();
    }

    const [task] = await db
      .update(videoTask)
      .set(updateData)
      .where(eq(videoTask.id, taskId))
      .returning();

    return task;
  },

  async updateTaskVideoUrls(
    taskId: string,
    duomiVideoUrl: string,
    finalVideoUrl: string
  ): Promise<VideoTaskType> {
    const [task] = await db
      .update(videoTask)
      .set({
        duomiVideoUrl,
        finalVideoUrl,
        status: "succeeded",
        progress: 100,
        completedAt: new Date(),
      })
      .where(eq(videoTask.id, taskId))
      .returning();

    return task;
  },

  async getTaskById(taskId: string): Promise<VideoTaskType | null> {
    const [task] = await db
      .select()
      .from(videoTask)
      .where(eq(videoTask.id, taskId))
      .limit(1);

    return task || null;
  },

  async getTaskByDuomiId(duomiTaskId: string): Promise<VideoTaskType | null> {
    const [task] = await db
      .select()
      .from(videoTask)
      .where(eq(videoTask.duomiTaskId, duomiTaskId))
      .limit(1);

    return task || null;
  },

  async getUserTasks(userId: string, limit = 50): Promise<VideoTaskType[]> {
    return db
      .select()
      .from(videoTask)
      .where(eq(videoTask.userId, userId))
      .orderBy(desc(videoTask.createdAt))
      .limit(limit);
  },

  async getActiveTasks(userId: string): Promise<VideoTaskType[]> {
    const tasks = await db
      .select()
      .from(videoTask)
      .where(eq(videoTask.userId, userId))
      .orderBy(desc(videoTask.createdAt));

    return tasks.filter(
      (task) => task.status === "pending" || task.status === "running"
    );
  },
};
