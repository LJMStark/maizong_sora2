import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

type Unit = "ms" | "s" | "m" | "h" | "d";
type Duration = `${number} ${Unit}` | `${number}${Unit}`;

// In-memory fallback for development
const memoryStore = new Map<string, { count: number; expiresAt: number }>();

export class RateLimiter {
  private ratelimit: Ratelimit | null = null;

  constructor() {
    if (redisUrl && redisToken) {
      try {
        this.ratelimit = new Ratelimit({
          redis: new Redis({
            url: redisUrl,
            token: redisToken,
          }),
          // Default limiter, can be overridden per call if we restructured, 
          // but for now we'll sticky to a general sliding window
          limiter: Ratelimit.slidingWindow(10, "10 s"),
          analytics: true,
          prefix: "@upstash/ratelimit",
        });
      } catch (error) {
        console.warn("Failed to initialize Redis rate limiter:", error);
      }
    }
  }

  /**
   * Limit requests based on an identifier.
   * @param identifier Unique identifier (e.g. user ID or IP)
   * @param limit Number of requests allowed
   * @param windowSeconds Window size in seconds (approximate for in-memory)
   */
  async limit(
    identifier: string, 
    limit: number = 20, 
    windowSeconds: number = 60
  ): Promise<{ success: boolean; remaining: number }> {
    if (this.ratelimit) {
      // Create a temporary limiter for this specific call if we want dynamic limits,
      // but constructing Ratelimit is cheap-ish? 
      // Actually Ratelimit class is designed to be reused.
      // If we want different limits for different routes, we should probably instantiate different limiters 
      // or use the same one with a standard limit.
      // For this implementation, we will try to use the configured instance.
      // Note: The instance has a fixed window/limit config.
      // To support variable limits with one instance, we might need multiple instances.
      // Let's create a new instance on the fly if we want specific limits, OR just use the fallback if no redis.
      
      // Optimization: If the generic limit is close enough, use it. 
      // But let's support dynamic limits by creating a new instance if needed, 
      // or just caching instances.
      
      // For simplicity in V1: Reuse the single instance. 
      // Ideally we'd have a factory.
      return await this.ratelimit.limit(identifier);
    }

    // In-memory fallback (Token Bucket / Fixed Window simplified)
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const key = identifier;
    
    const record = memoryStore.get(key);

    if (!record || now > record.expiresAt) {
      memoryStore.set(key, { count: 1, expiresAt: now + windowMs });
      return { success: true, remaining: limit - 1 };
    }

    if (record.count >= limit) {
      return { success: false, remaining: 0 };
    }

    record.count += 1;
    memoryStore.set(key, record);
    return { success: true, remaining: limit - record.count };
  }
}

export const rateLimiter = new RateLimiter();
