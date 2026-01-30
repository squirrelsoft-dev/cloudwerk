/**
 * @cloudwerk/auth - Rate Limiting Module
 *
 * Rate limiting for authentication endpoints and API routes.
 *
 * @example
 * ```typescript
 * import { createRateLimiter, createFixedWindowStorage } from '@cloudwerk/auth/rate-limit'
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

import type {
  RateLimitConfig,
  RateLimitResult,
  RateLimitStorage,
  RateLimitHeaders,
} from './types.js'

// Re-export types
export type {
  RateLimitConfig,
  RateLimitResult,
  RateLimitStorage,
  RateLimitStrategy,
  StrategyConfig,
  RateLimitMiddleware,
  RateLimitHeaders,
} from './types.js'

// Re-export storage implementations
export {
  createFixedWindowStorage,
  createSlidingWindowStorage,
  type KVNamespaceLike,
} from './strategy.js'

// ============================================================================
// Rate Limiter
// ============================================================================

/**
 * Rate limiter interface.
 */
export interface RateLimiter {
  /**
   * Check if request is allowed and increment counter.
   *
   * @param request - Request to check
   * @returns Response if rate limited, undefined if allowed
   */
  check(request: Request): Promise<{ response?: Response; result: RateLimitResult }>

  /**
   * Get current rate limit status without incrementing.
   *
   * @param request - Request to check
   * @returns Rate limit result
   */
  status(request: Request): Promise<RateLimitResult>

  /**
   * Reset rate limit for a request/key.
   *
   * @param request - Request to reset (or string key)
   */
  reset(request: Request | string): Promise<void>

  /**
   * Create rate limit headers from result.
   *
   * @param result - Rate limit result
   * @returns Headers object
   */
  headers(result: RateLimitResult): RateLimitHeaders
}

/**
 * Extended rate limit configuration with storage.
 */
export interface CreateRateLimiterOptions extends RateLimitConfig {
  /** Rate limit storage */
  storage: RateLimitStorage
}

/**
 * Create a rate limiter.
 *
 * @param options - Rate limiter options
 * @returns Rate limiter instance
 *
 * @example
 * ```typescript
 * // Basic usage with IP-based limiting
 * const limiter = createRateLimiter({
 *   limit: 100,
 *   window: 60,
 *   storage: createFixedWindowStorage(env.RATE_LIMIT_KV),
 * })
 *
 * // Custom key based on user ID
 * const userLimiter = createRateLimiter({
 *   limit: 1000,
 *   window: 3600, // 1000 requests per hour per user
 *   storage,
 *   keyGenerator: async (request) => {
 *     const session = await getSession(request)
 *     return session?.userId ?? getClientIP(request)
 *   },
 * })
 *
 * // Skip rate limiting for authenticated users
 * const publicLimiter = createRateLimiter({
 *   limit: 10,
 *   window: 60,
 *   storage,
 *   skip: async (request) => {
 *     const session = await getSession(request)
 *     return session !== null
 *   },
 * })
 * ```
 */
export function createRateLimiter(options: CreateRateLimiterOptions): RateLimiter {
  const {
    limit,
    window,
    storage,
    prefix = 'ratelimit:',
    keyGenerator = defaultKeyGenerator,
    skip,
    onRateLimited = defaultRateLimitedHandler,
  } = options

  return {
    async check(request: Request): Promise<{ response?: Response; result: RateLimitResult }> {
      // Check if should skip
      if (skip && (await skip(request))) {
        return {
          result: {
            allowed: true,
            remaining: limit,
            limit,
            reset: Math.floor(Date.now() / 1000) + window,
          },
        }
      }

      // Get key for this request
      const key = await keyGenerator(request)
      const fullKey = `${prefix}${key}`

      // Increment counter
      const result = await storage.increment(fullKey, window, limit)

      // Return rate limit response if exceeded
      if (!result.allowed) {
        const response = await onRateLimited(request, result)
        return { response, result }
      }

      return { result }
    },

    async status(request: Request): Promise<RateLimitResult> {
      const key = await keyGenerator(request)
      const fullKey = `${prefix}${key}`
      return storage.get(fullKey, window, limit)
    },

    async reset(requestOrKey: Request | string): Promise<void> {
      const key =
        typeof requestOrKey === 'string'
          ? requestOrKey
          : await keyGenerator(requestOrKey)
      const fullKey = `${prefix}${key}`
      await storage.reset(fullKey)
    },

    headers(result: RateLimitResult): RateLimitHeaders {
      const headers: RateLimitHeaders = {
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': String(result.reset),
      }

      if (result.retryAfter !== undefined) {
        headers['Retry-After'] = String(result.retryAfter)
      }

      return headers
    },
  }
}

// ============================================================================
// Default Implementations
// ============================================================================

/**
 * Default key generator using client IP.
 */
function defaultKeyGenerator(request: Request): string {
  return getClientIP(request)
}

/**
 * Get client IP from request.
 */
export function getClientIP(request: Request): string {
  // Cloudflare-specific header
  const cfIP = request.headers.get('CF-Connecting-IP')
  if (cfIP) return cfIP

  // Standard proxy header
  const xForwardedFor = request.headers.get('X-Forwarded-For')
  if (xForwardedFor) {
    const ips = xForwardedFor.split(',')
    return ips[0].trim()
  }

  // X-Real-IP header
  const xRealIP = request.headers.get('X-Real-IP')
  if (xRealIP) return xRealIP

  // Fallback
  return 'unknown'
}

/**
 * Default rate limit exceeded handler.
 */
function defaultRateLimitedHandler(
  _request: Request,
  result: RateLimitResult
): Response {
  return new Response(
    JSON.stringify({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: result.retryAfter,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(result.reset),
        'Retry-After': String(result.retryAfter ?? 0),
      },
    }
  )
}

// ============================================================================
// Middleware Helper
// ============================================================================

/**
 * Create a rate limit middleware function.
 *
 * @param limiter - Rate limiter instance
 * @returns Middleware function
 *
 * @example
 * ```typescript
 * const rateLimitMiddleware = createRateLimitMiddleware(limiter)
 *
 * // In a route
 * export async function GET(request: Request) {
 *   const result = await rateLimitMiddleware(request)
 *   if (result.response) {
 *     return result.response
 *   }
 *
 *   // Add rate limit headers to response
 *   const response = json({ data: 'hello' })
 *   for (const [key, value] of Object.entries(limiter.headers(result.result))) {
 *     response.headers.set(key, value)
 *   }
 *   return response
 * }
 * ```
 */
export function createRateLimitMiddleware(
  limiter: RateLimiter
): (request: Request) => Promise<{ response?: Response; result: RateLimitResult }> {
  return (request) => limiter.check(request)
}

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
