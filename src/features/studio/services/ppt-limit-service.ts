import { db } from "@/db";
import { user, pptTask, systemConfig } from "@/db/schema";
import { eq, and, gte, notInArray, sql } from "drizzle-orm";
import type { LimitCheckResult } from "@/features/studio/services/video-limit-service";
import { videoLimitService } from "@/features/studio/services/video-limit-service";

const DAILY_PPT_LIMIT_KEY = "daily_ppt_limit";
const DEFAULT_DAILY_PPT_LIMIT = -1;

export const pptLimitService = {
  /**
   * 检查用户今日是否还能创建 PPT 任务（按"套"计数）
   */
  async checkLimit(userId: string): Promise<LimitCheckResult> {
    const [todayCount, limit] = await Promise.all([
      this.getTodayGenerationCount(userId),
      this.getEffectiveLimit(userId),
    ]);

    if (limit === -1) {
      return { allowed: true, used: todayCount, limit: -1 };
    }

    if (limit === 0) {
      return {
        allowed: false,
        reason: "PPT 生成已被禁用",
        used: todayCount,
        limit: 0,
      };
    }

    if (todayCount >= limit) {
      return {
        allowed: false,
        reason: `今日 PPT 生成次数已用完（${todayCount}/${limit}），明日重置`,
        used: todayCount,
        limit,
      };
    }

    return { allowed: true, used: todayCount, limit };
  },

  /**
   * 今日已创建的 PPT 套数（排除整套失败/已取消的任务）
   */
  async getTodayGenerationCount(userId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(pptTask)
      .where(
        and(
          eq(pptTask.userId, userId),
          gte(pptTask.createdAt, today),
          notInArray(pptTask.status, ["error", "cancelled"])
        )
      );

    return result[0]?.count ?? 0;
  },

  /**
   * 有效限制（用户覆盖优先，否则全局配置）
   */
  async getEffectiveLimit(userId: string): Promise<number> {
    const userResult = await db
      .select({ dailyPptLimit: user.dailyPptLimit })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (userResult.length > 0 && userResult[0].dailyPptLimit !== null) {
      return userResult[0].dailyPptLimit;
    }

    return this.getGlobalLimit();
  },

  async getGlobalLimit(): Promise<number> {
    const config = await db
      .select({ value: systemConfig.value })
      .from(systemConfig)
      .where(eq(systemConfig.key, DAILY_PPT_LIMIT_KEY))
      .limit(1);

    if (config.length > 0) {
      const parsed = parseInt(config[0].value, 10);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }

    return DEFAULT_DAILY_PPT_LIMIT;
  },

  async updateGlobalLimit(limit: number, updatedBy: string): Promise<void> {
    await videoLimitService.upsertConfig(
      DAILY_PPT_LIMIT_KEY,
      limit.toString(),
      "每日 PPT 生成套数限制（-1 不限，0 禁用）",
      updatedBy
    );
  },
};
