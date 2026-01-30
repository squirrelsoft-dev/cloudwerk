/**
 * @cloudwerk/auth - Rate Limit Strategies
 *
 * Rate limiting strategy implementations.
 */

import type { RateLimitResult, RateLimitStorage } from './types.js'

// ============================================================================
// Fixed Window Strategy
// ============================================================================

/**
 * Fixed window rate limit data.
 */
interface FixedWindowData {
  count: number
  windowStart: number
}

/**
 * Create a fixed-window rate limit storage using KV.
 *
 * In a fixed window strategy, requests are counted within fixed time intervals.
 * When the window expires, the counter resets to zero.
 *
 * Pros:
 * - Simple to implement
 * - Predictable memory usage
 *
 * Cons:
 * - Burst at window boundaries (user can make 2x limit requests at boundary)
 *
 * **Concurrency Note**: Cloudflare KV does not support atomic increment operations.
 * Under high concurrency, the read-modify-write pattern may allow some requests
 * to slip through beyond the configured limit. For strict atomic rate limiting
 * where accuracy is critical, consider using Durable Objects instead.
 * See: https://github.com/squirrelsoft-dev/cloudwerk/issues/218
 *
 * @param kv - KV namespace
 * @param prefix - Key prefix
 * @returns Rate limit storage
 *
 * @example
 * ```typescript
 * const storage = createFixedWindowStorage(env.RATE_LIMIT_KV)
 *
 * const result = await storage.increment('user:123', 60, 100)
 * // { allowed: true, remaining: 99, limit: 100, reset: 1234567890 }
 * ```
 */
export function createFixedWindowStorage(
  kv: KVNamespaceLike,
  prefix: string = 'ratelimit:fixed:'
): RateLimitStorage {
  return {
    async increment(key: string, window: number, limit: number): Promise<RateLimitResult> {
      const now = Math.floor(Date.now() / 1000)
      const windowStart = Math.floor(now / window) * window
      const windowEnd = windowStart + window
      const fullKey = `${prefix}${key}:${windowStart}`

      // Get current count
      const stored = await kv.get(fullKey)
      let data: FixedWindowData

      if (stored) {
        data = JSON.parse(stored)
      } else {
        data = { count: 0, windowStart }
      }

      // Increment count
      data.count++

      // Store updated count
      const ttl = windowEnd - now + 1 // +1 for safety
      await kv.put(fullKey, JSON.stringify(data), { expirationTtl: Math.max(ttl, 1) })

      const allowed = data.count <= limit
      const remaining = Math.max(0, limit - data.count)

      return {
        allowed,
        remaining,
        limit,
        reset: windowEnd,
        retryAfter: allowed ? undefined : windowEnd - now,
      }
    },

    async get(key: string, window: number, limit: number): Promise<RateLimitResult> {
      const now = Math.floor(Date.now() / 1000)
      const windowStart = Math.floor(now / window) * window
      const windowEnd = windowStart + window
      const fullKey = `${prefix}${key}:${windowStart}`

      const stored = await kv.get(fullKey)
      const count = stored ? JSON.parse(stored).count : 0

      const allowed = count < limit
      const remaining = Math.max(0, limit - count)

      return {
        allowed,
        remaining,
        limit,
        reset: windowEnd,
        retryAfter: allowed ? undefined : windowEnd - now,
      }
    },

    async reset(key: string): Promise<void> {
      const now = Math.floor(Date.now() / 1000)
      // Delete keys for current and next few windows
      const windows = [0, 1, 2].map((i) => {
        const windowStart = Math.floor((now + i * 60) / 60) * 60
        return `${prefix}${key}:${windowStart}`
      })

      await Promise.all(windows.map((k) => kv.delete(k)))
    },
  }
}

// ============================================================================
// Sliding Window Strategy
// ============================================================================

/**
 * Sliding window rate limit data.
 */
interface SlidingWindowData {
  timestamps: number[]
}

/**
 * Create a sliding-window rate limit storage using KV.
 *
 * In a sliding window strategy, only requests within the last `window` seconds
 * are counted. This provides smoother rate limiting without boundary bursts.
 *
 * Pros:
 * - No boundary burst problem
 * - More accurate rate limiting
 *
 * Cons:
 * - Higher storage requirements (stores individual timestamps)
 * - More complex to implement
 *
 * **Concurrency Note**: Cloudflare KV does not support atomic increment operations.
 * Under high concurrency, the read-modify-write pattern may allow some requests
 * to slip through beyond the configured limit. For strict atomic rate limiting
 * where accuracy is critical, consider using Durable Objects instead.
 * See: https://github.com/squirrelsoft-dev/cloudwerk/issues/218
 *
 * @param kv - KV namespace
 * @param prefix - Key prefix
 * @returns Rate limit storage
 *
 * @example
 * ```typescript
 * const storage = createSlidingWindowStorage(env.RATE_LIMIT_KV)
 *
 * const result = await storage.increment('user:123', 60, 100)
 * // { allowed: true, remaining: 99, limit: 100, reset: 1234567890 }
 * ```
 */
export function createSlidingWindowStorage(
  kv: KVNamespaceLike,
  prefix: string = 'ratelimit:sliding:'
): RateLimitStorage {
  return {
    async increment(key: string, window: number, limit: number): Promise<RateLimitResult> {
      const now = Math.floor(Date.now() / 1000)
      const windowStart = now - window
      const fullKey = `${prefix}${key}`

      // Get current timestamps
      const stored = await kv.get(fullKey)
      let data: SlidingWindowData

      if (stored) {
        data = JSON.parse(stored)
        // Filter out expired timestamps
        data.timestamps = data.timestamps.filter((ts) => ts > windowStart)
      } else {
        data = { timestamps: [] }
      }

      // Add current timestamp
      data.timestamps.push(now)

      // Store updated timestamps
      await kv.put(fullKey, JSON.stringify(data), { expirationTtl: window + 1 })

      const count = data.timestamps.length
      const allowed = count <= limit
      const remaining = Math.max(0, limit - count)

      // Calculate reset time (when oldest request in window expires)
      let reset = now + window
      if (data.timestamps.length > 0) {
        const oldestInWindow = Math.min(...data.timestamps)
        reset = oldestInWindow + window
      }

      return {
        allowed,
        remaining,
        limit,
        reset,
        retryAfter: allowed ? undefined : reset - now,
      }
    },

    async get(key: string, window: number, limit: number): Promise<RateLimitResult> {
      const now = Math.floor(Date.now() / 1000)
      const windowStart = now - window
      const fullKey = `${prefix}${key}`

      const stored = await kv.get(fullKey)
      let timestamps: number[] = []

      if (stored) {
        const data: SlidingWindowData = JSON.parse(stored)
        timestamps = data.timestamps.filter((ts) => ts > windowStart)
      }

      const count = timestamps.length
      const allowed = count < limit
      const remaining = Math.max(0, limit - count)

      let reset = now + window
      if (timestamps.length > 0) {
        const oldestInWindow = Math.min(...timestamps)
        reset = oldestInWindow + window
      }

      return {
        allowed,
        remaining,
        limit,
        reset,
        retryAfter: allowed ? undefined : reset - now,
      }
    },

    async reset(key: string): Promise<void> {
      await kv.delete(`${prefix}${key}`)
    },
  }
}

// ============================================================================
// KV Interface
// ============================================================================

/**
 * KV namespace interface.
 */
export interface KVNamespaceLike {
  get(key: string): Promise<string | null>
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>
  delete(key: string): Promise<void>
}
