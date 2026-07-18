import { db } from "@/db";
import {
  pptTask,
  pptSlide,
  PptTaskType,
  PptSlideType,
  PptOutlineSlide,
  PptTemplateProfile,
} from "@/db/schema";
import { and, asc, desc, eq, inArray, isNull, lt, sql } from "drizzle-orm";

export type PptTaskStatus = PptTaskType["status"];

const ACTIVE_TASK_STATUSES: PptTaskStatus[] = [
  "pending",
  "generating_sample",
  "awaiting_confirm",
  "generating",
];

export interface CreatePptTaskParams {
  userId: string;
  sessionId?: string;
  title: string;
  skillKey: string;
  styleKey: string;
  anchorColor?: string;
  resolution: "2k" | "4k";
  pageCount: number;
  outline: PptOutlineSlide[];
  templateProfile?: PptTemplateProfile;
  templateRefImageUrls?: string[];
  sampleFirst: boolean;
  speechNotesEnabled: boolean;
  creditCostPerPage: number;
  creditCostTotal: number;
  creditTransactionId: string;
  /** 与 outline 一一对应的最终提示词 */
  slidePrompts: string[];
}

export const pptTaskService = {
  isTaskActive(task: PptTaskType): boolean {
    return ACTIVE_TASK_STATUSES.includes(task.status);
  },

  async createTaskWithSlides(
    params: CreatePptTaskParams
  ): Promise<{ task: PptTaskType; slides: PptSlideType[] }> {
    const taskId = crypto.randomUUID();

    return db.transaction(async (tx) => {
      const [task] = await tx
        .insert(pptTask)
        .values({
          id: taskId,
          userId: params.userId,
          sessionId: params.sessionId,
          title: params.title,
          skillKey: params.skillKey,
          styleKey: params.styleKey,
          anchorColor: params.anchorColor,
          resolution: params.resolution,
          pageCount: params.pageCount,
          outline: params.outline,
          templateProfile: params.templateProfile,
          templateRefImageUrls: params.templateRefImageUrls,
          sampleFirst: params.sampleFirst,
          speechNotesEnabled: params.speechNotesEnabled,
          status: "pending",
          creditCostPerPage: params.creditCostPerPage,
          creditCostTotal: params.creditCostTotal,
          creditTransactionId: params.creditTransactionId,
        })
        .returning();

      const slides = await tx
        .insert(pptSlide)
        .values(
          params.outline.map((slide, i) => ({
            id: crypto.randomUUID(),
            taskId,
            userId: params.userId,
            slideIndex: slide.index,
            title: slide.title,
            content: {
              bullets: slide.bullets,
              layoutRole: slide.layoutRole,
              promptOverride: slide.promptOverride,
            },
            prompt: params.slidePrompts[i],
            isSample: params.sampleFirst && i === 0,
          }))
        )
        .returning();

      return { task, slides };
    });
  },

  async getTaskById(taskId: string): Promise<PptTaskType | null> {
    const [task] = await db
      .select()
      .from(pptTask)
      .where(eq(pptTask.id, taskId))
      .limit(1);
    return task || null;
  },

  async getSlides(taskId: string): Promise<PptSlideType[]> {
    return db
      .select()
      .from(pptSlide)
      .where(eq(pptSlide.taskId, taskId))
      .orderBy(asc(pptSlide.slideIndex));
  },

  async getSlideByIndex(
    taskId: string,
    slideIndex: number
  ): Promise<PptSlideType | null> {
    const [slide] = await db
      .select()
      .from(pptSlide)
      .where(
        and(eq(pptSlide.taskId, taskId), eq(pptSlide.slideIndex, slideIndex))
      )
      .limit(1);
    return slide || null;
  },

  async getUserTasks(userId: string, limit = 50): Promise<PptTaskType[]> {
    return db
      .select()
      .from(pptTask)
      .where(eq(pptTask.userId, userId))
      .orderBy(desc(pptTask.createdAt))
      .limit(limit);
  },

  /** 任务列表封面用：各任务已成功页（按页序升序） */
  async getSucceededSlidesForTasks(
    taskIds: string[]
  ): Promise<Pick<PptSlideType, "taskId" | "slideIndex" | "finalImageUrl">[]> {
    if (taskIds.length === 0) return [];
    return db
      .select({
        taskId: pptSlide.taskId,
        slideIndex: pptSlide.slideIndex,
        finalImageUrl: pptSlide.finalImageUrl,
      })
      .from(pptSlide)
      .where(
        and(
          inArray(pptSlide.taskId, taskIds),
          eq(pptSlide.status, "succeeded")
        )
      )
      .orderBy(asc(pptSlide.slideIndex));
  },

  async getUserActiveTasks(userId: string): Promise<PptTaskType[]> {
    return db
      .select()
      .from(pptTask)
      .where(
        and(
          eq(pptTask.userId, userId),
          inArray(pptTask.status, ACTIVE_TASK_STATUSES)
        )
      )
      .orderBy(desc(pptTask.createdAt));
  },

  /**
   * 条件状态迁移：仅当任务处于 from 状态之一时迁移到 to。
   * 输家（并发竞争失败）返回 null，不产生副作用。
   */
  async transitionTaskIfStatus(
    taskId: string,
    from: PptTaskStatus[],
    to: PptTaskStatus,
    extra?: Partial<Pick<PptTaskType, "errorMessage">>
  ): Promise<PptTaskType | null> {
    const updateData: Partial<PptTaskType> = { status: to, ...extra };
    if (["succeeded", "partial", "error", "cancelled"].includes(to)) {
      updateData.completedAt = new Date();
    }

    const [task] = await db
      .update(pptTask)
      .set(updateData)
      .where(and(eq(pptTask.id, taskId), inArray(pptTask.status, from)))
      .returning();

    return task || null;
  },

  async addRefundedCredits(taskId: string, amount: number): Promise<void> {
    await db
      .update(pptTask)
      .set({
        refundedCredits: sql`${pptTask.refundedCredits} + ${amount}`,
      })
      .where(eq(pptTask.id, taskId));
  },

  /**
   * 认领待生成页：queued → running（providerTaskId 置空，等待 kick 填充）。
   * retryBackoffMs > 0 时要求距上次更新超过退避时间（重试页的退避门）。
   */
  async claimSlide(
    slideId: string,
    retryBackoffMs = 0
  ): Promise<PptSlideType | null> {
    const conditions = [eq(pptSlide.id, slideId), eq(pptSlide.status, "queued")];
    if (retryBackoffMs > 0) {
      conditions.push(
        lt(pptSlide.updatedAt, new Date(Date.now() - retryBackoffMs))
      );
    }

    const [slide] = await db
      .update(pptSlide)
      .set({ status: "running", providerTaskId: null })
      .where(and(...conditions))
      .returning();

    return slide || null;
  },

  /**
   * 僵尸回收：running 且 providerTaskId 为空且长时间未更新
   * （上一个赢家在认领后、创建 provider 任务前崩溃）。
   */
  async reclaimZombieSlide(
    slideId: string,
    staleMs: number
  ): Promise<PptSlideType | null> {
    const [slide] = await db
      .update(pptSlide)
      .set({ updatedAt: new Date() })
      .where(
        and(
          eq(pptSlide.id, slideId),
          eq(pptSlide.status, "running"),
          isNull(pptSlide.providerTaskId),
          lt(pptSlide.updatedAt, new Date(Date.now() - staleMs))
        )
      )
      .returning();

    return slide || null;
  },

  async setSlideProviderTaskId(
    slideId: string,
    providerTaskId: string
  ): Promise<PptSlideType | null> {
    const [slide] = await db
      .update(pptSlide)
      .set({ providerTaskId })
      .where(and(eq(pptSlide.id, slideId), eq(pptSlide.status, "running")))
      .returning();

    return slide || null;
  },

  async completeSlideIfRunning(
    slideId: string,
    urls: { duomiImageUrl: string; finalImageUrl: string }
  ): Promise<PptSlideType | null> {
    const [slide] = await db
      .update(pptSlide)
      .set({
        status: "succeeded",
        duomiImageUrl: urls.duomiImageUrl,
        finalImageUrl: urls.finalImageUrl,
        errorMessage: null,
        completedAt: new Date(),
      })
      .where(and(eq(pptSlide.id, slideId), eq(pptSlide.status, "running")))
      .returning();

    return slide || null;
  },

  /**
   * 可重试失败：running → queued，retryCount+1。
   * 以 expectedRetryCount 作为条件防止并发双重 requeue。
   */
  async requeueSlideIfRunning(
    slideId: string,
    expectedRetryCount: number,
    errorMessage: string
  ): Promise<PptSlideType | null> {
    const [slide] = await db
      .update(pptSlide)
      .set({
        status: "queued",
        providerTaskId: null,
        retryCount: expectedRetryCount + 1,
        errorMessage,
      })
      .where(
        and(
          eq(pptSlide.id, slideId),
          eq(pptSlide.status, "running"),
          eq(pptSlide.retryCount, expectedRetryCount)
        )
      )
      .returning();

    return slide || null;
  },

  async failSlideIfRunning(
    slideId: string,
    errorMessage: string
  ): Promise<PptSlideType | null> {
    const [slide] = await db
      .update(pptSlide)
      .set({
        status: "error",
        errorMessage,
        completedAt: new Date(),
      })
      .where(and(eq(pptSlide.id, slideId), eq(pptSlide.status, "running")))
      .returning();

    return slide || null;
  },

  /** 取消所有待生成页（含认领后尚未 kick 的 running 页），返回被取消的行 */
  async cancelPendingSlides(taskId: string): Promise<PptSlideType[]> {
    return db
      .update(pptSlide)
      .set({ status: "cancelled", completedAt: new Date() })
      .where(
        and(
          eq(pptSlide.taskId, taskId),
          sql`(${pptSlide.status} = 'queued' OR (${pptSlide.status} = 'running' AND ${pptSlide.providerTaskId} IS NULL))`
        )
      )
      .returning();
  },

  /** 单页退款防双退守卫：只有第一个把 refunded 置 true 的调用方执行退款 */
  async markSlideRefundedOnce(slideId: string): Promise<PptSlideType | null> {
    const [slide] = await db
      .update(pptSlide)
      .set({ refunded: true })
      .where(and(eq(pptSlide.id, slideId), eq(pptSlide.refunded, false)))
      .returning();

    return slide || null;
  },

  /**
   * 单页重生成/样张重生成：重置为 queued 并绑定新扣费交易。
   * 仅允许对终态页（succeeded/error/cancelled）执行。
   */
  async resetSlideForRegen(
    slideId: string,
    params: { prompt?: string; regenTransactionId: string }
  ): Promise<PptSlideType | null> {
    const updateData: Partial<PptSlideType> = {
      status: "queued",
      providerTaskId: null,
      retryCount: 0,
      errorMessage: null,
      refunded: false,
      regenTransactionId: params.regenTransactionId,
      completedAt: null,
    };
    if (params.prompt !== undefined) {
      updateData.prompt = params.prompt;
    }

    const [slide] = await db
      .update(pptSlide)
      .set(updateData)
      .where(
        and(
          eq(pptSlide.id, slideId),
          inArray(pptSlide.status, ["succeeded", "error", "cancelled"])
        )
      )
      .returning();

    return slide || null;
  },

  /** 批量更新未完成页的提示词（样张换风格后同步剩余页） */
  async updatePendingSlidePrompts(
    taskId: string,
    prompts: Map<number, string>
  ): Promise<void> {
    for (const [slideIndex, prompt] of prompts) {
      await db
        .update(pptSlide)
        .set({ prompt })
        .where(
          and(
            eq(pptSlide.taskId, taskId),
            eq(pptSlide.slideIndex, slideIndex),
            eq(pptSlide.status, "queued")
          )
        );
    }
  },

  async updateTaskStyle(
    taskId: string,
    params: { styleKey: string; anchorColor?: string | null }
  ): Promise<void> {
    await db
      .update(pptTask)
      .set({ styleKey: params.styleKey, anchorColor: params.anchorColor })
      .where(eq(pptTask.id, taskId));
  },

  async updateSlideSpeechNotes(
    taskId: string,
    notes: Map<number, string>
  ): Promise<void> {
    for (const [slideIndex, speechNotes] of notes) {
      await db
        .update(pptSlide)
        .set({ speechNotes })
        .where(
          and(
            eq(pptSlide.taskId, taskId),
            eq(pptSlide.slideIndex, slideIndex)
          )
        );
    }
  },
};
