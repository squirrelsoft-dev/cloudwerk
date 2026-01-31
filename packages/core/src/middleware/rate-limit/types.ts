/**
 * @cloudwerk/core - Rate Limiting Types
 *
 * Type definitions for rate limiting middleware.
 */

// ============================================================================
// Rate Limit Configuration
// ============================================================================

/**
 * Rate limit configuration.
 */
export interface RateLimitConfig {
  /**
   * Maximum number of requests allowed in the window.
   */
  limit: number

  /**
   * Time window in seconds.
   */
  window: number

  /**
   * Key prefix for storage.
   * @default 'ratelimit:'
   */
  prefix?: string

  /**
   * Custom key generator function.
   * Default: uses IP address.
   */
  keyGenerator?: (request: Request) => string | Promise<string>

  /**
   * Skip rate limiting for certain requests.
   */
  skip?: (request: Request) => boolean | Promise<boolean>

  /**
   * Custom handler when rate limit is exceeded.
   * Default: returns 429 response.
   */
  onRateLimited?: (request: Request, result: RateLimitResult) => Response | Promise<Response>
}

/**
 * Rate limit result.
 */
export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean

  /** Number of remaining requests in current window */
  remaining: number

  /** Total limit for the window */
  limit: number

  /** Unix timestamp (seconds) when the window resets */
  reset: number

  /** Retry-After value in seconds (only when not allowed) */
  retryAfter?: number
}

/**
 * Rate limit storage interface.
 */
export interface RateLimitStorage {
  /**
   * Increment the counter for a key and get the result.
   *
   * @param key - Rate limit key
   * @param window - Window size in seconds
   * @param limit - Maximum requests allowed
   * @returns Rate limit result
   */
  increment(key: string, window: number, limit: number): Promise<RateLimitResult>

  /**
   * Get current rate limit status without incrementing.
   *
   * @param key - Rate limit key
   * @param window - Window size in seconds
   * @param limit - Maximum requests allowed
   * @returns Rate limit result
   */
  get(key: string, window: number, limit: number): Promise<RateLimitResult>

  /**
   * Reset the counter for a key.
   *
   * @param key - Rate limit key
   */
  reset(key: string): Promise<void>
}

// ============================================================================
// Strategy Types
// ============================================================================

/**
 * Rate limit strategy.
 */
export type RateLimitStrategy = 'fixed-window' | 'sliding-window'

/**
 * Strategy configuration.
 */
export interface StrategyConfig {
  /** Strategy type */
  strategy?: RateLimitStrategy

  /** Additional strategy-specific options */
  [key: string]: unknown
}

// ============================================================================
// Middleware Types
// ============================================================================

/**
 * Rate limit middleware function.
 */
export type RateLimitMiddleware = (
  request: Request
) => Promise<{ response?: Response; result: RateLimitResult }>

/**
 * Rate limit headers.
 */
export interface RateLimitHeaders {
  'X-RateLimit-Limit': string
  'X-RateLimit-Remaining': string
  'X-RateLimit-Reset': string
  'Retry-After'?: string
}
