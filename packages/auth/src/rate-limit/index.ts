/**
 * @cloudwerk/auth - Rate Limiting Module
 *
 * Rate limiting for authentication endpoints and API routes.
 *
 * **Note**: Generic rate limiting utilities have been moved to `@cloudwerk/core/middleware`.
 * This module re-exports them for backwards compatibility and adds auth-specific rate limiters.
 *
 * @example
 * ```typescript
 * // For general rate limiting, prefer importing from core:
 * import { createRateLimiter, createFixedWindowStorage } from '@cloudwerk/core/middleware'
 *
 * // For auth-specific rate limiters, import from this module:
 * import { createLoginRateLimiter } from '@cloudwerk/auth/rate-limit'
 * ```
 */

// ============================================================================
// Re-exports from @cloudwerk/core/middleware (backwards compatibility)
// ============================================================================

/**
 * @deprecated Import from `@cloudwerk/core/middleware` instead.
 */
export {
  // Types
  type RateLimitConfig,
  type RateLimitResult,
  type RateLimitStorage,
  type RateLimitStrategy,
  type StrategyConfig,
  type RateLimitMiddleware,
  type RateLimitHeaders,

  // Storage strategies
  createFixedWindowStorage,
  createSlidingWindowStorage,
  type KVNamespaceLike,

  // Rate limiter
  createRateLimiter,
  createRateLimitMiddleware,
  type RateLimiter,
  type CreateRateLimiterOptions,

  // Utilities
  getClientIP,
  defaultKeyGenerator,
} from '@cloudwerk/core/middleware'

// Import types needed for auth-specific limiters
import type {
  RateLimitConfig,
  RateLimitStorage,
  RateLimiter,
} from '@cloudwerk/core/middleware'
import { createRateLimiter, getClientIP } from '@cloudwerk/core/middleware'

// ============================================================================
// Auth-Specific Rate Limiters
// ============================================================================

/**
 * Create a rate limiter for login attempts.
 *
 * Uses both IP and email as keys to prevent targeted attacks
 * while still allowing legitimate users to try again.
 *
 * @param storage - Rate limit storage
 * @param options - Optional configuration overrides
 * @returns Rate limiter
 *
 * @example
 * ```typescript
 * import { createLoginRateLimiter } from '@cloudwerk/auth/rate-limit'
 * import { createSlidingWindowStorage } from '@cloudwerk/core/middleware'
 *
 * const loginLimiter = createLoginRateLimiter(
 *   createSlidingWindowStorage(env.RATE_LIMIT_KV)
 * )
 *
 * // In sign-in handler
 * const { response, result } = await loginLimiter.check(request)
 * if (response) {
 *   return response
 * }
 * ```
 */
export function createLoginRateLimiter(
  storage: RateLimitStorage,
  options: Partial<RateLimitConfig> = {}
): RateLimiter {
  return createRateLimiter({
    limit: options.limit ?? 5, // 5 attempts
    window: options.window ?? 900, // per 15 minutes
    storage,
    prefix: options.prefix ?? 'ratelimit:login:',
    keyGenerator:
      options.keyGenerator ??
      (async (request) => {
        const ip = getClientIP(request)
        // Try to get email from request body for additional keying
        try {
          const clone = request.clone()
          const body = await clone.json()
          if (body.email) {
            return `${ip}:${body.email.toLowerCase()}`
          }
        } catch {
          // Ignore parse errors
        }
        return ip
      }),
    ...options,
  })
}

/**
 * Create a rate limiter for password reset requests.
 *
 * @param storage - Rate limit storage
 * @param options - Optional configuration overrides
 * @returns Rate limiter
 *
 * @example
 * ```typescript
 * import { createPasswordResetRateLimiter } from '@cloudwerk/auth/rate-limit'
 * import { createFixedWindowStorage } from '@cloudwerk/core/middleware'
 *
 * const resetLimiter = createPasswordResetRateLimiter(
 *   createFixedWindowStorage(env.RATE_LIMIT_KV)
 * )
 * ```
 */
export function createPasswordResetRateLimiter(
  storage: RateLimitStorage,
  options: Partial<RateLimitConfig> = {}
): RateLimiter {
  return createRateLimiter({
    limit: options.limit ?? 3, // 3 requests
    window: options.window ?? 3600, // per hour
    storage,
    prefix: options.prefix ?? 'ratelimit:reset:',
    ...options,
  })
}

/**
 * Create a rate limiter for email verification requests.
 *
 * @param storage - Rate limit storage
 * @param options - Optional configuration overrides
 * @returns Rate limiter
 *
 * @example
 * ```typescript
 * import { createEmailVerificationRateLimiter } from '@cloudwerk/auth/rate-limit'
 * import { createFixedWindowStorage } from '@cloudwerk/core/middleware'
 *
 * const emailLimiter = createEmailVerificationRateLimiter(
 *   createFixedWindowStorage(env.RATE_LIMIT_KV)
 * )
 * ```
 */
export function createEmailVerificationRateLimiter(
  storage: RateLimitStorage,
  options: Partial<RateLimitConfig> = {}
): RateLimiter {
  return createRateLimiter({
    limit: options.limit ?? 5, // 5 emails
    window: options.window ?? 3600, // per hour
    storage,
    prefix: options.prefix ?? 'ratelimit:email:',
    ...options,
  })
}
