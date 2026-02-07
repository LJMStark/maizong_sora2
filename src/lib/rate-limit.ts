import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

// Rate limit configurations for different endpoints
export const RATE_LIMITS = {
  redeem: { requests: 5, windowSeconds: 60 },        // 5 requests per minute
  imageGenerate: { requests: 10, windowSeconds: 60 }, // 10 requests per minute
  videoGenerate: { requests: 3, windowSeconds: 60 },  // 3 requests per minute
  default: { requests: 20, windowSeconds: 60 },       // 20 requests per minute
} as const;

export type RateLimitKey = keyof typeof RATE_LIMITS;

// In-memory fallback for development
const memoryStore = new Map<string, { count: number; expiresAt: number }>();

// Cache for Redis rate limiters with different configurations
const redisLimiterCache = new Map<string, Ratelimit>();

function getRedisLimiter(requests: number, windowSeconds: number): Ratelimit | null {
  if (!redisUrl || !redisToken) return null;

  const cacheKey = `${requests}:${windowSeconds}`;
  const cached = redisLimiterCache.get(cacheKey);
  if (cached) return cached;

  try {
    const limiter = new Ratelimit({
      redis: new Redis({
        url: redisUrl,
        token: redisToken,
      }),
      limiter: Ratelimit.slidingWindow(requests, `${windowSeconds} s`),
      analytics: true,
      prefix: `@upstash/ratelimit:${cacheKey}`,
    });
    redisLimiterCache.set(cacheKey, limiter);
    return limiter;
  } catch (error) {
    console.warn("Failed to initialize Redis rate limiter:", error);
    return null;
  }
}

export class RateLimiter {
  /**
   * Limit requests based on an identifier and limit key.
   * @param identifier Unique identifier (e.g. user ID or IP)
   * @param limitKey Key from RATE_LIMITS config (default: "default")
   */
  async limit(
    identifier: string,
    limitKey: RateLimitKey = "default"
  ): Promise<{ success: boolean; remaining: number }> {
    const config = RATE_LIMITS[limitKey];
    const { requests, windowSeconds } = config;

    // Try Redis first
    const redisLimiter = getRedisLimiter(requests, windowSeconds);
    if (redisLimiter) {
      const prefixedIdentifier = `${limitKey}:${identifier}`;
      return await redisLimiter.limit(prefixedIdentifier);
    }

    // In-memory fallback (Fixed Window)
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const key = `${limitKey}:${identifier}`;

    const record = memoryStore.get(key);

    if (!record || now > record.expiresAt) {
      memoryStore.set(key, { count: 1, expiresAt: now + windowMs });
      return { success: true, remaining: requests - 1 };
    }

    if (record.count >= requests) {
      return { success: false, remaining: 0 };
    }

    record.count += 1;
    memoryStore.set(key, record);
    return { success: true, remaining: requests - record.count };
  }
}

export const rateLimiter = new RateLimiter();
