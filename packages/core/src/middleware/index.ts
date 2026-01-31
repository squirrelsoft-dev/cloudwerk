/**
 * @cloudwerk/core - Middleware Utilities
 *
 * Generic middleware utilities including rate limiting.
 *
 * @example
 * ```typescript
 * import {
 *   createRateLimiter,
 *   createFixedWindowStorage,
 *   getClientIP,
 * } from '@cloudwerk/core/middleware'
 *
 * // Create rate limiter
 * const storage = createFixedWindowStorage(env.RATE_LIMIT_KV)
 * const limiter = createRateLimiter({
 *   limit: 100,
 *   window: 60,
 *   storage,
 * })
 *
 * // Use in middleware
 * export const middleware: Middleware = async (request, next) => {
 *   const { response, result } = await limiter.check(request)
 *   if (response) return response
 *
 *   const res = await next()
 *   for (const [key, value] of Object.entries(limiter.headers(result))) {
 *     res.headers.set(key, String(value))
 *   }
 *   return res
 * }
 * ```
 */

// Re-export everything from rate-limit
export * from './rate-limit/index.js'
