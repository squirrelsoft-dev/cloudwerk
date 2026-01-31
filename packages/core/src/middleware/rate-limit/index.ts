/**
 * @cloudwerk/core - Rate Limiting
 *
 * Generic rate limiting utilities for API routes and middleware.
 *
 * @example
 * ```typescript
 * import {
 *   createRateLimiter,
 *   createFixedWindowStorage,
 * } from '@cloudwerk/core/middleware'
 *
 * // Create storage
 * const storage = createFixedWindowStorage(env.RATE_LIMIT_KV)
 *
 * // Create rate limiter
 * const rateLimiter = createRateLimiter({
 *   limit: 100,
 *   window: 60, // 100 requests per minute
 *   storage,
 * })
 *
 * // Use in middleware
 * const { response, result } = await rateLimiter.check(request)
 * if (response) {
 *   return response // Rate limited
 * }
 * ```
 */

// Types
export type {
  RateLimitConfig,
  RateLimitResult,
  RateLimitStorage,
  RateLimitStrategy,
  StrategyConfig,
  RateLimitMiddleware,
  RateLimitHeaders,
} from './types.js'

// Storage strategies
export {
  createFixedWindowStorage,
  createSlidingWindowStorage,
  type KVNamespaceLike,
} from './strategy.js'

// Rate limiter
export {
  createRateLimiter,
  createRateLimitMiddleware,
  type RateLimiter,
  type CreateRateLimiterOptions,
} from './limiter.js'

// Utilities
export { getClientIP, defaultKeyGenerator } from './utils.js'
