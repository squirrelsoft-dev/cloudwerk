/**
 * @cloudwerk/security - Origin Validation Middleware
 *
 * Validates Origin and Referer headers to prevent cross-origin attacks.
 */

import type { Middleware } from '@cloudwerk/core'
import type { OriginValidationOptions } from '../types.js'

/** Default methods requiring origin validation */
const DEFAULT_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE']

/**
 * Check if an origin matches an allowed host.
 *
 * @param originHost - The host from the Origin header
 * @param allowedHost - The allowed host to check against
 * @param allowSubdomains - Whether to allow subdomains
 * @returns True if the origin matches
 */
function hostMatches(
  originHost: string,
  allowedHost: string,
  allowSubdomains: boolean
): boolean {
  if (originHost === allowedHost) {
    return true
  }

  if (allowSubdomains && originHost.endsWith(`.${allowedHost}`)) {
    return true
  }

  return false
}

/**
 * Validate an origin against allowed origins and hosts.
 *
 * @param origin - The Origin header value
 * @param options - Validation options
 * @returns True if the origin is allowed
 */
function isOriginAllowed(origin: string, options: OriginValidationOptions): boolean {
  const { allowedOrigins = [], allowedHosts = [], allowSubdomains = false } = options

  // Check against allowed origins (exact match)
  if (allowedOrigins.includes(origin)) {
    return true
  }

  // Parse origin to get host
  let originHost: string
  try {
    const url = new URL(origin)
    originHost = url.host
  } catch {
    return false
  }

  // Check against allowed hosts
  for (const allowedHost of allowedHosts) {
    if (hostMatches(originHost, allowedHost, allowSubdomains)) {
      return true
    }
  }

  return false
}

/**
 * Create origin validation middleware.
 *
 * Validates that mutation requests (POST, PUT, PATCH, DELETE) come from
 * allowed origins. This helps prevent CSRF attacks by rejecting requests
 * from unknown origins.
 *
 * @param options - Validation options
 * @returns Middleware function
 *
 * @example
 * ```typescript
 * import { originValidationMiddleware } from '@cloudwerk/security/middleware'
 *
 * export const middleware = originValidationMiddleware({
 *   allowedOrigins: ['https://myapp.com', 'https://admin.myapp.com'],
 * })
 * ```
 *
 * @example
 * ```typescript
 * // Allow all subdomains of a host
 * export const middleware = originValidationMiddleware({
 *   allowedHosts: ['myapp.com'],
 *   allowSubdomains: true,
 * })
 * ```
 */
export function originValidationMiddleware(
  options: OriginValidationOptions = {}
): Middleware {
  const {
    allowedOrigins = [],
    allowedHosts = [],
    methods = DEFAULT_METHODS,
    excludePaths = [],
    rejectMissingOrigin = true,
  } = options

  // If no origins or hosts are configured, skip validation
  const hasConfig = allowedOrigins.length > 0 || allowedHosts.length > 0

  return async (request, next) => {
    // Skip if no configuration
    if (!hasConfig) {
      return next()
    }

    // Skip if method doesn't require validation
    if (!methods.includes(request.method)) {
      return next()
    }

    // Skip excluded paths
    const url = new URL(request.url)
    if (excludePaths.some((path) => url.pathname.startsWith(path))) {
      return next()
    }

    // Get Origin header (preferred) or fall back to Referer
    let origin = request.headers.get('Origin')

    if (!origin) {
      const referer = request.headers.get('Referer')
      if (referer) {
        try {
          const refererUrl = new URL(referer)
          origin = refererUrl.origin
        } catch {
          // Invalid referer URL
        }
      }
    }

    // Check if origin is missing
    if (!origin) {
      if (rejectMissingOrigin) {
        return Response.json(
          { error: 'Missing Origin header' },
          { status: 403 }
        )
      }
      // Allow if configured to not reject missing origins
      return next()
    }

    // Validate origin
    if (!isOriginAllowed(origin, options)) {
      return Response.json(
        { error: 'Origin not allowed' },
        { status: 403 }
      )
    }

    return next()
  }
}
