import { db } from "@/db";
import { user, videoTask, systemConfig } from "@/db/schema";
import { eq, and, gte, ne, sql } from "drizzle-orm";

export type VideoType = "fast" | "quality";

export interface LimitCheckResult {
  allowed: boolean;
  reason?: string;
  used: number;
  limit: number;
}

export const videoLimitService = {
  /**
   * 检查用户是否可以生成视频
   */
  async checkLimit(userId: string, videoType: VideoType): Promise<LimitCheckResult> {
    const todayCount = await this.getTodayGenerationCount(userId, videoType);
    const limit = await this.getEffectiveLimit(userId, videoType);

    // -1 表示无限制
    if (limit === -1) {
      return { allowed: true, used: todayCount, limit: -1 };
    }

    // 0 表示禁止生成
    if (limit === 0) {
      return {
        allowed: false,
        reason: `${videoType === "fast" ? "普通" : "高质量"}视频生成已被禁用`,
        used: todayCount,
        limit: 0,
      };
    }

    // 检查是否超限
    if (todayCount >= limit) {
      return {
        allowed: false,
        reason: `今日${videoType === "fast" ? "普通" : "高质量"}视频生成次数已用完（${todayCount}/${limit}），明日重置`,
        used: todayCount,
        limit,
      };
    }

    return { allowed: true, used: todayCount, limit };
  },

  /**
   * 获取用户今日生成数量
   */
  async getTodayGenerationCount(userId: string, videoType: VideoType): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const model = videoType === "fast" ? "sora-2-temporary" : "sora-2-pro";

    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(videoTask)
      .where(
        and(
          eq(videoTask.userId, userId),
          eq(videoTask.model, model),
          gte(videoTask.createdAt, today),
          ne(videoTask.status, "error")
        )
      );

    return result[0]?.count ?? 0;
  },

  /**
   * 获取有效限制值（用户覆盖优先）
   */
  async getEffectiveLimit(userId: string, videoType: VideoType): Promise<number> {
    // 1. 查询用户自定义限制
    const userResult = await db
      .select({
        dailyFastVideoLimit: user.dailyFastVideoLimit,
        dailyQualityVideoLimit: user.dailyQualityVideoLimit,
      })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (userResult.length > 0) {
      const userLimit =
        videoType === "fast"
          ? userResult[0].dailyFastVideoLimit
          : userResult[0].dailyQualityVideoLimit;

      // 如果用户有自定义值，使用用户值
      if (userLimit !== null) {
        return userLimit;
      }
    }

    // 2. 否则使用全局默认值
    return this.getGlobalLimit(videoType);
  },

  /**
   * 获取全局限制配置
   */
  async getGlobalLimit(videoType: VideoType): Promise<number> {
    const configKey =
      videoType === "fast" ? "daily_fast_video_limit" : "daily_quality_video_limit";

    const config = await db
      .select({ value: systemConfig.value })
      .from(systemConfig)
      .where(eq(systemConfig.key, configKey))
      .limit(1);

    if (config.length > 0) {
      return parseInt(config[0].value, 10);
    }

    // 默认值：普通不限制，高质量 2 条
    return videoType === "fast" ? -1 : 2;
  },

  /**
   * 获取所有全局限制配置
   */
  async getGlobalLimits(): Promise<{
    dailyFastVideoLimit: number;
    dailyQualityVideoLimit: number;
  }> {
    const configs = await db
      .select({ key: systemConfig.key, value: systemConfig.value })
      .from(systemConfig)
      .where(
        sql`${systemConfig.key} IN ('daily_fast_video_limit', 'daily_quality_video_limit')`
      );

    const result = {
      dailyFastVideoLimit: -1,
      dailyQualityVideoLimit: 2,
    };

    for (const config of configs) {
      if (config.key === "daily_fast_video_limit") {
        result.dailyFastVideoLimit = parseInt(config.value, 10);
      } else if (config.key === "daily_quality_video_limit") {
        result.dailyQualityVideoLimit = parseInt(config.value, 10);
      }
    }

    return result;
  },

  /**
   * 更新全局限制配置
   */
  async updateGlobalLimits(
    limits: {
      dailyFastVideoLimit?: number;
      dailyQualityVideoLimit?: number;
    },
    updatedBy: string
  ): Promise<void> {
    const updates: { key: string; value: string }[] = [];

    if (limits.dailyFastVideoLimit !== undefined) {
      updates.push({
        key: "daily_fast_video_limit",
        value: limits.dailyFastVideoLimit.toString(),
      });
    }

    if (limits.dailyQualityVideoLimit !== undefined) {
      updates.push({
        key: "daily_quality_video_limit",
        value: limits.dailyQualityVideoLimit.toString(),
      });
    }

    for (const update of updates) {
      await db
        .update(systemConfig)
        .set({
          value: update.value,
          updatedAt: new Date(),
          updatedBy,
        })
        .where(eq(systemConfig.key, update.key));
    }
  },

  /**
   * 获取用户的限制使用情况
   */
  async getUserLimitStatus(userId: string): Promise<{
    fast: { used: number; limit: number };
    quality: { used: number; limit: number };
  }> {
    const [fastCheck, qualityCheck] = await Promise.all([
      this.checkLimit(userId, "fast"),
      this.checkLimit(userId, "quality"),
    ]);

    return {
      fast: { used: fastCheck.used, limit: fastCheck.limit },
      quality: { used: qualityCheck.used, limit: qualityCheck.limit },
    };
  },
};
