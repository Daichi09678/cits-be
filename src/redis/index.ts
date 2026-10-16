import Redis from "ioredis";
import { env } from "../config/env";

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 0,
  enableOfflineQueue: false,
  retryStrategy(times) {
    if (times > 2) return null; // Stop retrying if Redis is not running
    return 1000;
  },
  lazyConnect: true,
});

redis.on("connect", () => {
  console.log("⚡ Connected to Redis successfully");
});

redis.on("error", () => {
  // Silent fail-safe when Redis is offline (Postgres will handle direct data)
});

// Cache helpers (fail-safe if Redis offline)
export async function getCache<T>(key: string): Promise<T | null> {
  try {
    if (redis.status !== "ready") return null;
    const data = await redis.get(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  } catch {
    return null;
  }
}

export async function setCache(
  key: string,
  value: unknown,
  ttlSeconds: number = 300
): Promise<void> {
  try {
    if (redis.status !== "ready") return;
    await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch {
    // Graceful skip
  }
}

export async function invalidateCache(pattern: string): Promise<void> {
  try {
    if (redis.status !== "ready") return;
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch {
    // Graceful skip
  }
}

// Rate Limiter helper (e.g. for contact form submissions)
export async function checkRateLimit(
  key: string,
  limit: number = 5,
  windowSeconds: number = 60
): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const current = await redis.incr(key);
    if (current === 1) {
      await redis.expire(key, windowSeconds);
    }
    return {
      allowed: current <= limit,
      remaining: Math.max(0, limit - current),
    };
  } catch {
    // If redis fails, fail open to not block users
    return { allowed: true, remaining: limit };
  }
}
