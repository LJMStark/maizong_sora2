import { db } from "@/db";
import { videoTask, VideoTaskType } from "@/db/schema";
import { eq, desc, and, ne, sql } from "drizzle-orm";

export type VideoProvider = "duomi" | "kie" | "veo";

export interface CreateVideoTaskParams {
  userId: string;
  sessionId?: string;
  model: "sora-2" | "sora-2-temporary" | "sora-2-pro" | "veo3.1-fast";
  prompt: string;
  aspectRatio: string;
  duration: number;
  sourceImageUrl?: string;
  creditCost: number;
  creditTransactionId: string;
  provider?: VideoProvider;
}

export const videoTaskService = {
  async createTask(params: CreateVideoTaskParams): Promise<VideoTaskType> {
    const taskId = crypto.randomUUID();

    const [task] = await db
      .insert(videoTask)
      .values({
        id: taskId,
        userId: params.userId,
        sessionId: params.sessionId,
        provider: params.provider ?? "duomi",
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
    status: "pending" | "running" | "succeeded" | "error" | "retrying",
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
  ): Promise<VideoTaskType | null> {
    const [task] = await db
      .update(videoTask)
      .set({
        duomiVideoUrl,
        finalVideoUrl,
        status: "succeeded",
        progress: 100,
        completedAt: new Date(),
      })
      .where(
        and(
          eq(videoTask.id, taskId),
          ne(videoTask.status, "error")
        )
      )
      .returning();

    return task || null;
  },

  async getTaskById(taskId: string): Promise<VideoTaskType | null> {
    const [task] = await db
      .select()
      .from(videoTask)
      .where(eq(videoTask.id, taskId))
      .limit(1);

    return task || null;
  },

  async getTaskByProviderTaskId(
    providerTaskId: string,
    provider: VideoProvider
  ): Promise<VideoTaskType | null> {
    const [task] = await db
      .select()
      .from(videoTask)
      .where(
        and(
          eq(videoTask.duomiTaskId, providerTaskId),
          eq(videoTask.provider, provider)
        )
      )
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

  async getUserTasksBySession(
    userId: string,
    sessionId: string
  ): Promise<VideoTaskType[]> {
    return db
      .select()
      .from(videoTask)
      .where(and(eq(videoTask.userId, userId), eq(videoTask.sessionId, sessionId)))
      .orderBy(desc(videoTask.createdAt));
  },

  async updateProvider(
    taskId: string,
    provider: VideoProvider
  ): Promise<VideoTaskType> {
    const [task] = await db
      .update(videoTask)
      .set({ provider })
      .where(eq(videoTask.id, taskId))
      .returning();

    return task;
  },

  async incrementRetryCount(
    taskId: string,
    type: "generate" | "callback"
  ): Promise<VideoTaskType> {
    const updateData =
      type === "generate"
        ? {
            generateRetryCount: sql`${videoTask.generateRetryCount} + 1`,
            lastRetryAt: new Date(),
          }
        : {
            callbackRetryCount: sql`${videoTask.callbackRetryCount} + 1`,
            lastRetryAt: new Date(),
          };

    const [updatedTask] = await db
      .update(videoTask)
      .set(updateData)
      .where(eq(videoTask.id, taskId))
      .returning();

    if (!updatedTask) {
      throw new Error("Task not found");
    }

    return updatedTask;
  },

  async transitionToErrorIfActive(params: {
    taskId: string;
    progress?: number;
    errorMessage?: string;
  }): Promise<VideoTaskType | null> {
    const updateData: Partial<VideoTaskType> = {
      status: "error",
      completedAt: new Date(),
    };

    if (params.progress !== undefined) {
      updateData.progress = params.progress;
    }

    if (params.errorMessage !== undefined) {
      updateData.errorMessage = params.errorMessage;
    }

    const [task] = await db
      .update(videoTask)
      .set(updateData)
      .where(
        and(
          eq(videoTask.id, params.taskId),
          ne(videoTask.status, "succeeded"),
          ne(videoTask.status, "error")
        )
      )
      .returning();

    return task || null;
  },
};
