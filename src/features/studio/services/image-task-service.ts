import { db } from "@/db";
import { imageTask, ImageTaskType } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export interface CreateImageTaskParams {
  userId: string;
  mode: "generate" | "edit";
  model: "gemini-3-pro-image-preview" | "gemini-2.5-flash-image";
  prompt: string;
  aspectRatio?: string;
  sourceImageUrl?: string;
  creditCost: number;
  creditTransactionId: string;
}

export const imageTaskService = {
  async createTask(params: CreateImageTaskParams): Promise<ImageTaskType> {
    const taskId = crypto.randomUUID();

    const [task] = await db
      .insert(imageTask)
      .values({
        id: taskId,
        userId: params.userId,
        mode: params.mode,
        model: params.model,
        prompt: params.prompt,
        aspectRatio: params.aspectRatio,
        sourceImageUrl: params.sourceImageUrl,
        creditCost: params.creditCost,
        creditTransactionId: params.creditTransactionId,
        status: "pending",
      })
      .returning();

    return task;
  },

  async updateDuomiTaskId(
    taskId: string,
    duomiTaskId: string
  ): Promise<ImageTaskType> {
    const [task] = await db
      .update(imageTask)
      .set({ duomiTaskId })
      .where(eq(imageTask.id, taskId))
      .returning();

    return task;
  },

  async updateTaskStatus(
    taskId: string,
    status: "pending" | "running" | "succeeded" | "error",
    errorMessage?: string
  ): Promise<ImageTaskType> {
    const updateData: Partial<ImageTaskType> = { status };

    if (errorMessage !== undefined) {
      updateData.errorMessage = errorMessage;
    }

    if (status === "succeeded" || status === "error") {
      updateData.completedAt = new Date();
    }

    const [task] = await db
      .update(imageTask)
      .set(updateData)
      .where(eq(imageTask.id, taskId))
      .returning();

    return task;
  },

  async updateTaskImageUrls(
    taskId: string,
    duomiImageUrl: string,
    finalImageUrl: string
  ): Promise<ImageTaskType> {
    const [task] = await db
      .update(imageTask)
      .set({
        duomiImageUrl,
        finalImageUrl,
        status: "succeeded",
        completedAt: new Date(),
      })
      .where(eq(imageTask.id, taskId))
      .returning();

    return task;
  },

  async getTaskById(taskId: string): Promise<ImageTaskType | null> {
    const [task] = await db
      .select()
      .from(imageTask)
      .where(eq(imageTask.id, taskId))
      .limit(1);

    return task || null;
  },

  async getTaskByDuomiId(duomiTaskId: string): Promise<ImageTaskType | null> {
    const [task] = await db
      .select()
      .from(imageTask)
      .where(eq(imageTask.duomiTaskId, duomiTaskId))
      .limit(1);

    return task || null;
  },

  async getUserTasks(userId: string, limit = 50): Promise<ImageTaskType[]> {
    return db
      .select()
      .from(imageTask)
      .where(eq(imageTask.userId, userId))
      .orderBy(desc(imageTask.createdAt))
      .limit(limit);
  },

  async getActiveTasks(userId: string): Promise<ImageTaskType[]> {
    const tasks = await db
      .select()
      .from(imageTask)
      .where(eq(imageTask.userId, userId))
      .orderBy(desc(imageTask.createdAt));

    return tasks.filter(
      (task) => task.status === "pending" || task.status === "running"
    );
  },
};
