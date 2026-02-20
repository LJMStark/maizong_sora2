import { db } from "@/db";
import { user, videoTask, systemConfig } from "@/db/schema";
import { eq, and, gte, ne, sql } from "drizzle-orm";

export type VideoType = "fast" | "quality";
export type VideoProvider = "kie" | "duomi" | "veo";

export interface LimitCheckResult {
  allowed: boolean;
  reason?: string;
  used: number;
  limit: number;
}

export interface CreditCosts {
  videoFast: number;
  videoQuality: number;
  image: number;
}

export interface VideoGenerationConfig {
  creditCosts: CreditCosts;
  providers: {
    fast: VideoProvider;
    quality: VideoProvider;
  };
}

// 配置缓存（60秒过期）
const CONFIG_CACHE_TTL = 60 * 1000;
let configCache: {
  data: VideoGenerationConfig;
  expiry: number;
} | null = null;

export const videoLimitService = {
  /**
   * 获取视频生成配置（带缓存）
   * 一次查询获取积分和供应商配置，减少数据库访问
   */
  async getVideoGenerationConfig(): Promise<VideoGenerationConfig> {
    // 检查缓存
    if (configCache && Date.now() < configCache.expiry) {
      return configCache.data;
    }

    // 一次查询获取所有配置
    const configs = await db
      .select({ key: systemConfig.key, value: systemConfig.value })
      .from(systemConfig)
      .where(
        sql`${systemConfig.key} IN (
          'credit_cost_video_fast', 'credit_cost_video_quality', 'credit_cost_image',
          'video_fast_provider', 'video_quality_provider'
        )`
      );

    const result: VideoGenerationConfig = {
      creditCosts: {
        videoFast: 30,
        videoQuality: 100,
        image: 10,
      },
      providers: {
        fast: "kie",
        quality: "kie",
      },
    };

    for (const config of configs) {
      switch (config.key) {
        case "credit_cost_video_fast": {
          const v = parseInt(config.value, 10);
          if (!isNaN(v) && v >= 0) result.creditCosts.videoFast = v;
          break;
        }
        case "credit_cost_video_quality": {
          const v = parseInt(config.value, 10);
          if (!isNaN(v) && v >= 0) result.creditCosts.videoQuality = v;
          break;
        }
        case "credit_cost_image": {
          const v = parseInt(config.value, 10);
          if (!isNaN(v) && v >= 0) result.creditCosts.image = v;
          break;
        }
        case "video_fast_provider":
          if (config.value === "kie" || config.value === "duomi" || config.value === "veo") {
            result.providers.fast = config.value;
          }
          break;
        case "video_quality_provider":
          if (config.value === "kie" || config.value === "duomi" || config.value === "veo") {
            result.providers.quality = config.value;
          }
          break;
      }
    }

    // 更新缓存
    configCache = {
      data: result,
      expiry: Date.now() + CONFIG_CACHE_TTL,
    };

    return result;
  },

  /**
   * 清除配置缓存（配置更新后调用）
   */
  clearConfigCache(): void {
    configCache = null;
  },

  /**
   * 获取视频配置版本（用于前端热更新）
   */
  async getConfigVersion(): Promise<string> {
    const latestConfig = await db
      .select({
        latestUpdatedAt: sql<Date | string | null>`max(${systemConfig.updatedAt})`,
      })
      .from(systemConfig)
      .where(
        sql`${systemConfig.key} IN (
          'video_fast_provider', 'video_quality_provider',
          'credit_cost_video_fast', 'credit_cost_video_quality',
          'daily_fast_video_limit', 'daily_quality_video_limit'
        )`
      );

    const latestValue = latestConfig[0]?.latestUpdatedAt;
    if (!latestValue) {
      return "0";
    }

    const latestDate =
      latestValue instanceof Date ? latestValue : new Date(latestValue);

    return Number.isNaN(latestDate.getTime())
      ? "0"
      : latestDate.toISOString();
  },

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

  /**
   * 获取模式对应的供应商（使用缓存）
   */
  async getProviderForMode(mode: VideoType): Promise<VideoProvider> {
    const config = await this.getVideoGenerationConfig();
    return config.providers[mode];
  },

  /**
   * 获取所有供应商配置（按模式，使用缓存）
   */
  async getProviderSettings(): Promise<{
    videoFastProvider: VideoProvider;
    videoQualityProvider: VideoProvider;
  }> {
    const config = await this.getVideoGenerationConfig();
    return {
      videoFastProvider: config.providers.fast,
      videoQualityProvider: config.providers.quality,
    };
  },

  /**
   * 更新供应商配置（按模式）
   */
  async updateProviderForMode(
    mode: VideoType,
    provider: VideoProvider,
    updatedBy: string
  ): Promise<void> {
    const configKey = mode === "fast" ? "video_fast_provider" : "video_quality_provider";
    const description = mode === "fast" ? "快速视频供应商" : "高质量视频供应商";

    await this.upsertConfig(configKey, provider, description, updatedBy);
    this.clearConfigCache();
  },

  /**
   * 批量更新供应商配置
   */
  async updateProviderSettings(
    settings: { videoFastProvider?: VideoProvider; videoQualityProvider?: VideoProvider },
    updatedBy: string
  ): Promise<void> {
    if (settings.videoFastProvider !== undefined) {
      await this.updateProviderForMode("fast", settings.videoFastProvider, updatedBy);
    }
    if (settings.videoQualityProvider !== undefined) {
      await this.updateProviderForMode("quality", settings.videoQualityProvider, updatedBy);
    }
  },

  /**
   * 获取积分消耗配置（使用缓存）
   */
  async getCreditCosts(): Promise<CreditCosts> {
    const config = await this.getVideoGenerationConfig();
    return config.creditCosts;
  },

  /**
   * 更新积分消耗配置
   */
  async updateCreditCosts(
    costs: { videoFast?: number; videoQuality?: number; image?: number },
    updatedBy: string
  ): Promise<void> {
    if (costs.videoFast !== undefined && costs.videoFast >= 0) {
      await this.upsertConfig(
        "credit_cost_video_fast",
        costs.videoFast.toString(),
        "快速视频积分消耗",
        updatedBy
      );
    }
    if (costs.videoQuality !== undefined && costs.videoQuality >= 0) {
      await this.upsertConfig(
        "credit_cost_video_quality",
        costs.videoQuality.toString(),
        "高质量视频积分消耗",
        updatedBy
      );
    }
    if (costs.image !== undefined && costs.image >= 0) {
      await this.upsertConfig(
        "credit_cost_image",
        costs.image.toString(),
        "图片生成积分消耗",
        updatedBy
      );
    }
    this.clearConfigCache();
  },

  /**
   * 通用配置 upsert 方法
   */
  async upsertConfig(
    key: string,
    value: string,
    description: string,
    updatedBy: string
  ): Promise<void> {
    const existing = await db
      .select({ id: systemConfig.id })
      .from(systemConfig)
      .where(eq(systemConfig.key, key))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(systemConfig)
        .set({
          value,
          updatedAt: new Date(),
          updatedBy,
        })
        .where(eq(systemConfig.key, key));
    } else {
      await db.insert(systemConfig).values({
        id: crypto.randomUUID(),
        key,
        value,
        description,
        updatedBy,
      });
    }
  },
};
