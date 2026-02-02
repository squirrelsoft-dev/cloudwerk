/**
 * @cloudwerk/security - X-Requested-With Validation Middleware
 *
 * Requires X-Requested-With header to force CORS preflight for cross-origin requests.
 */

import type { Middleware } from '@cloudwerk/core'
import type { RequestedWithOptions } from '../types.js'

/** Default methods requiring X-Requested-With validation */
const DEFAULT_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE']

/** Default required header value */
const DEFAULT_REQUIRED_VALUE = 'XMLHttpRequest'

/**
 * Create X-Requested-With validation middleware.
 *
 * Requires mutation requests to include an `X-Requested-With` header.
 * This forces CORS preflight for cross-origin requests, providing an
 * additional layer of protection against CSRF attacks.
 *
 * The X-Requested-With header is a custom header that cannot be set
 * cross-origin without a CORS preflight. By requiring it, we ensure
 * that cross-origin requests must pass CORS checks.
 *
 * @param options - Validation options
 * @returns Middleware function
 *
 * @example
 * ```typescript
 * import { requestedWithMiddleware } from '@cloudwerk/security/middleware'
 *
 * // Default: requires X-Requested-With: XMLHttpRequest
 * export const middleware = requestedWithMiddleware()
 * ```
 *
 * @example
 * ```typescript
 * // Custom header value
 * export const middleware = requestedWithMiddleware({
 *   requiredValue: 'fetch',
 *   excludePaths: ['/api/webhooks'],
 * })
 * ```
 */
export function requestedWithMiddleware(
  options: RequestedWithOptions = {}
): Middleware {
  const {
    requiredValue = DEFAULT_REQUIRED_VALUE,
    methods = DEFAULT_METHODS,
    excludePaths = [],
  } = options

  return async (request, next) => {
    // Skip if method doesn't require validation
    if (!methods.includes(request.method)) {
      return next()
    }

    // Skip excluded paths
    const url = new URL(request.url)
    if (excludePaths.some((path) => url.pathname.startsWith(path))) {
      return next()
    }

    // Check X-Requested-With header
    const headerValue = request.headers.get('X-Requested-With')

    if (!headerValue) {
      return Response.json(
        { error: 'Missing X-Requested-With header' },
        { status: 403 }
      )
    }

    if (headerValue !== requiredValue) {
      return Response.json(
        { error: 'Invalid X-Requested-With header' },
        { status: 403 }
      )
    }

    return next()
  }
}
