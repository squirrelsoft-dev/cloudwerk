/**
 * @cloudwerk/security - Combined Security Middleware
 *
 * All-in-one middleware that combines CSRF, security headers, CSP,
 * origin validation, and X-Requested-With validation.
 */

import type { Middleware } from '@cloudwerk/core'
import type { SecurityMiddlewareOptions } from '../types.js'
import { csrfMiddleware } from '../csrf/middleware.js'
import { securityHeadersMiddleware } from '../headers/security-headers.js'
import { cspMiddleware } from '../headers/csp.js'
import { originValidationMiddleware } from '../origin/middleware.js'
import { requestedWithMiddleware } from '../request/middleware.js'

/**
 * Compose multiple middleware functions into one.
 *
 * Executes middleware in order, passing the response through each.
 *
 * @example
 * ```typescript
 * import { composeMiddleware } from '@cloudwerk/security'
 * import { securityMiddleware } from '@cloudwerk/security/middleware'
 * import { authMiddleware } from '@cloudwerk/auth/middleware'
 *
 * export const middleware = composeMiddleware([
 *   securityMiddleware(),
 *   authMiddleware(),
 * ])
 * ```
 */
export function composeMiddleware(middlewares: Middleware[]): Middleware {
  return async (request, next) => {
    // Build the middleware chain in reverse order
    let handler: () => Promise<Response> = next

    for (let i = middlewares.length - 1; i >= 0; i--) {
      const middleware = middlewares[i]
      const prevHandler = handler
      handler = async () => middleware(request, prevHandler)
    }

    return handler()
  }
}

/**
 * Create a combined security middleware.
 *
 * This middleware composes multiple security protections with sensible defaults:
 * - **csrf**: Enabled by default - validates CSRF tokens on mutation requests
 * - **requestedWith**: Enabled by default - requires X-Requested-With header
 * - **headers**: Enabled by default - sets security headers (nosniff, DENY, etc.)
 * - **csp**: Disabled by default - requires app-specific configuration
 * - **origin**: Disabled by default - requires allowedOrigins configuration
 *
 * @param options - Configuration options for each protection
 * @returns Middleware function
 *
 * @example
 * ```typescript
 * import { securityMiddleware } from '@cloudwerk/security/middleware'
 *
 * // Use with all defaults
 * export const middleware = securityMiddleware()
 * ```
 *
 * @example
 * ```typescript
 * // Full configuration
 * export const middleware = securityMiddleware({
 *   allowedOrigins: ['https://myapp.com'],
 *   csrf: {
 *     excludePaths: ['/api/webhooks/stripe'],
 *   },
 *   csp: {
 *     directives: {
 *       defaultSrc: ["'self'"],
 *       scriptSrc: ["'self'", 'https://cdn.example.com'],
 *     },
 *     reportOnly: true,
 *   },
 *   headers: {
 *     frameOptions: 'SAMEORIGIN',
 *   },
 * })
 * ```
 *
 * @example
 * ```typescript
 * // Disable specific protections
 * export const middleware = securityMiddleware({
 *   csrf: false,            // Disable CSRF
 *   requestedWith: false,   // Disable X-Requested-With
 * })
 * ```
 */
export function securityMiddleware(
  options: SecurityMiddlewareOptions = {}
): Middleware {
  const middlewares: Middleware[] = []

  // Add security headers middleware (enabled by default)
  if (options.headers !== false) {
    const headersOptions = typeof options.headers === 'object' ? options.headers : {}
    middlewares.push(securityHeadersMiddleware(headersOptions))
  }

  // Add CSP middleware (disabled by default - requires configuration)
  if (options.csp && typeof options.csp === 'object') {
    middlewares.push(cspMiddleware(options.csp))
  }

  // Add origin validation middleware (disabled by default unless allowedOrigins provided)
  if (options.origin !== false) {
    const originOptions = typeof options.origin === 'object'
      ? { ...options.origin }
      : { allowedOrigins: options.allowedOrigins }

    // Merge shorthand allowedOrigins into origin options
    if (options.allowedOrigins && !originOptions.allowedOrigins) {
      originOptions.allowedOrigins = options.allowedOrigins
    }

    // Only add if there are actual origins/hosts configured
    if (originOptions.allowedOrigins?.length || originOptions.allowedHosts?.length) {
      middlewares.push(originValidationMiddleware(originOptions))
    }
  }

  // Add X-Requested-With middleware (enabled by default)
  if (options.requestedWith !== false) {
    const requestedWithOptions = typeof options.requestedWith === 'object'
      ? options.requestedWith
      : {}
    middlewares.push(requestedWithMiddleware(requestedWithOptions))
  }

  // Add CSRF middleware (enabled by default)
  if (options.csrf !== false) {
    const csrfOptions = typeof options.csrf === 'object' ? options.csrf : {}
    middlewares.push(csrfMiddleware(csrfOptions))
  }

  // If no middleware is enabled, just pass through
  if (middlewares.length === 0) {
    return async (_request: Request, next: () => Promise<Response>) => next()
  }

  // Compose all middleware
  return composeMiddleware(middlewares)
}
