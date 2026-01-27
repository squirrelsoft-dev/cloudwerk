/**
 * @cloudwerk/core - Route Config Storage and Access
 *
 * Provides storage and retrieval of route configuration within the request context.
 * Route config is set by the framework during request handling and can be accessed
 * by middleware and handlers via getRouteConfig().
 */

import { getContext } from './context.js'
import type { RouteConfig, AuthRequirement, RateLimitConfig, CacheConfig } from './types.js'

// ============================================================================
// Constants
// ============================================================================

/**
 * Internal key used to store route config in the context data store.
 * @internal
 */
export const ROUTE_CONFIG_KEY = '__cloudwerk_route_config'

// ============================================================================
// Route Config Access
// ============================================================================

/**
 * Get the route configuration for the current request.
 *
 * Returns `undefined` if:
 * - Called outside of a request context
 * - No config was exported from the route file
 *
 * @returns The route configuration or undefined
 *
 * @example
 * // In middleware
 * import type { Middleware } from '@cloudwerk/core'
 * import { getRouteConfig } from '@cloudwerk/core'
 *
 * export const middleware: Middleware = async (request, next) => {
 *   const config = getRouteConfig()
 *
 *   if (config?.auth === 'required') {
 *     // Verify authentication
 *     const token = request.headers.get('Authorization')
 *     if (!token) {
 *       return new Response('Unauthorized', { status: 401 })
 *     }
 *   }
 *
 *   return next()
 * }
 */
export function getRouteConfig(): RouteConfig | undefined {
  try {
    const ctx = getContext()
    return ctx.get<RouteConfig>(ROUTE_CONFIG_KEY)
  } catch {
    // Called outside of request context
    return undefined
  }
}

/**
 * Set the route configuration for the current request.
 *
 * This is called internally by the framework before invoking route handlers.
 * It should NOT be called by user code.
 *
 * @param config - The route configuration to set (or undefined to clear)
 *
 * @internal
 */
export function setRouteConfig(config: RouteConfig | undefined): void {
  const ctx = getContext()
  ctx.set(ROUTE_CONFIG_KEY, config)
}

// ============================================================================
// Route Config Validation
// ============================================================================

/** Valid auth requirement values */
const VALID_AUTH_VALUES: AuthRequirement[] = ['required', 'optional', 'none']

/** Valid cache shorthand values */
const VALID_CACHE_SHORTHANDS = ['public', 'private', 'no-store']

/** Valid rate limit window pattern: number followed by m/h/d */
const RATE_LIMIT_WINDOW_PATTERN = /^\d+[mhd]$/

/** Rate limit shorthand pattern: "requests/window" */
const RATE_LIMIT_SHORTHAND_PATTERN = /^\d+\/\d+[mhd]$/

/**
 * Validate and normalize a route configuration object.
 *
 * Ensures all config values are valid and throws descriptive errors if not.
 * Custom keys are preserved as-is.
 *
 * @param config - The configuration to validate (may be any value)
 * @param filePath - Path to the route file (for error messages)
 * @returns The validated RouteConfig
 * @throws Error if config is invalid
 *
 * @internal
 */
export function validateRouteConfig(config: unknown, filePath: string): RouteConfig {
  // Handle null/undefined -> return empty config
  if (config === null || config === undefined) {
    return {}
  }

  // Must be an object
  if (typeof config !== 'object' || Array.isArray(config)) {
    throw new Error(
      `Invalid route config in ${filePath}: config must be an object, got ${Array.isArray(config) ? 'array' : typeof config}`
    )
  }

  const configObj = config as Record<string, unknown>
  const result: RouteConfig = {}

  // Validate 'auth' if present
  if ('auth' in configObj) {
    const auth = configObj.auth
    if (!VALID_AUTH_VALUES.includes(auth as AuthRequirement)) {
      throw new Error(
        `Invalid route config in ${filePath}: auth must be 'required', 'optional', or 'none', got '${String(auth)}'`
      )
    }
    result.auth = auth as AuthRequirement
  }

  // Validate 'rateLimit' if present
  if ('rateLimit' in configObj) {
    const rateLimit = configObj.rateLimit
    result.rateLimit = validateRateLimit(rateLimit, filePath)
  }

  // Validate 'cache' if present
  if ('cache' in configObj) {
    const cache = configObj.cache
    result.cache = validateCache(cache, filePath)
  }

  // Copy any custom keys as-is (for plugins/middleware)
  for (const key of Object.keys(configObj)) {
    if (key !== 'auth' && key !== 'rateLimit' && key !== 'cache') {
      result[key] = configObj[key]
    }
  }

  return result
}

/**
 * Validate rate limit configuration.
 *
 * @param rateLimit - Rate limit value to validate
 * @param filePath - Path to route file (for errors)
 * @returns Validated RateLimitConfig
 * @throws Error if invalid
 */
function validateRateLimit(rateLimit: unknown, filePath: string): RateLimitConfig {
  // String format: "100/1m" (100 requests per 1 minute)
  if (typeof rateLimit === 'string') {
    if (!RATE_LIMIT_SHORTHAND_PATTERN.test(rateLimit)) {
      throw new Error(
        `Invalid route config in ${filePath}: rateLimit string must be in format 'requests/window' (e.g., '100/1m'), got '${rateLimit}'`
      )
    }
    return rateLimit
  }

  // Object format: { requests: number, window: string }
  if (typeof rateLimit === 'object' && rateLimit !== null && !Array.isArray(rateLimit)) {
    const obj = rateLimit as Record<string, unknown>

    // Validate 'requests' field
    if (typeof obj.requests !== 'number' || !Number.isInteger(obj.requests) || obj.requests < 1) {
      throw new Error(
        `Invalid route config in ${filePath}: rateLimit.requests must be a positive integer, got '${String(obj.requests)}'`
      )
    }

    // Validate 'window' field
    if (typeof obj.window !== 'string' || !RATE_LIMIT_WINDOW_PATTERN.test(obj.window)) {
      throw new Error(
        `Invalid route config in ${filePath}: rateLimit.window must be a string like '1m', '1h', or '1d', got '${String(obj.window)}'`
      )
    }

    return { requests: obj.requests, window: obj.window }
  }

  throw new Error(
    `Invalid route config in ${filePath}: rateLimit must be a string (e.g., '100/1m') or object { requests, window }, got ${typeof rateLimit}`
  )
}

/**
 * Validate cache configuration.
 *
 * @param cache - Cache value to validate
 * @param filePath - Path to route file (for errors)
 * @returns Validated CacheConfig
 * @throws Error if invalid
 */
function validateCache(cache: unknown, filePath: string): CacheConfig {
  // String shorthand: 'public', 'private', 'no-store'
  if (typeof cache === 'string') {
    if (!VALID_CACHE_SHORTHANDS.includes(cache)) {
      throw new Error(
        `Invalid route config in ${filePath}: cache string must be 'public', 'private', or 'no-store', got '${cache}'`
      )
    }
    return cache as CacheConfig
  }

  // Object format: { maxAge: number, staleWhileRevalidate?: number }
  if (typeof cache === 'object' && cache !== null && !Array.isArray(cache)) {
    const obj = cache as Record<string, unknown>

    // Validate 'maxAge' field (required)
    if (typeof obj.maxAge !== 'number' || !Number.isInteger(obj.maxAge) || obj.maxAge < 0) {
      throw new Error(
        `Invalid route config in ${filePath}: cache.maxAge must be a non-negative integer, got '${String(obj.maxAge)}'`
      )
    }

    const result: { maxAge: number; staleWhileRevalidate?: number } = {
      maxAge: obj.maxAge,
    }

    // Validate 'staleWhileRevalidate' field (optional)
    if ('staleWhileRevalidate' in obj) {
      if (
        typeof obj.staleWhileRevalidate !== 'number' ||
        !Number.isInteger(obj.staleWhileRevalidate) ||
        obj.staleWhileRevalidate < 0
      ) {
        throw new Error(
          `Invalid route config in ${filePath}: cache.staleWhileRevalidate must be a non-negative integer, got '${String(obj.staleWhileRevalidate)}'`
        )
      }
      result.staleWhileRevalidate = obj.staleWhileRevalidate
    }

    return result
  }

  throw new Error(
    `Invalid route config in ${filePath}: cache must be a string ('public', 'private', 'no-store') or object { maxAge, staleWhileRevalidate? }, got ${typeof cache}`
  )
}
