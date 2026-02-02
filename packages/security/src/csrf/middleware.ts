/**
 * @cloudwerk/security - CSRF Middleware
 *
 * Provides CSRF (Cross-Site Request Forgery) protection for mutation requests.
 * Uses the double-submit cookie pattern for stateless CSRF protection.
 */

import type { Middleware } from '@cloudwerk/core'
import type { CSRFMiddlewareOptions } from '../types.js'
import {
  DEFAULT_CSRF_COOKIE_NAME,
  DEFAULT_CSRF_HEADER_NAME,
  DEFAULT_CSRF_FORM_FIELD_NAME,
  getCsrfTokenFromCookie,
  getCsrfTokenFromHeader,
  getCsrfTokenFromFormBody,
  verifyCsrfToken,
} from './token.js'

/** Default methods requiring CSRF validation */
const DEFAULT_CSRF_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE']

/**
 * Create CSRF protection middleware.
 *
 * Validates that mutation requests (POST, PUT, PATCH, DELETE) include a valid
 * CSRF token that matches the token in the cookie. Uses the double-submit
 * cookie pattern for stateless CSRF protection.
 *
 * The token can be provided via:
 * 1. Request header (X-CSRF-Token by default) - for AJAX requests
 * 2. Form field (csrf_token by default) - for traditional form submissions
 *
 * @param options - Middleware configuration options
 * @returns Middleware function
 *
 * @example
 * ```typescript
 * // In middleware.ts
 * import { csrfMiddleware } from '@cloudwerk/security/middleware'
 *
 * export const middleware = csrfMiddleware()
 * ```
 *
 * @example
 * ```typescript
 * // Exclude webhook paths
 * export const middleware = csrfMiddleware({
 *   excludePaths: ['/api/webhooks/stripe', '/api/webhooks/github'],
 * })
 * ```
 */
export function csrfMiddleware(options: CSRFMiddlewareOptions = {}): Middleware {
  const {
    cookieName = DEFAULT_CSRF_COOKIE_NAME,
    headerName = DEFAULT_CSRF_HEADER_NAME,
    formFieldName = DEFAULT_CSRF_FORM_FIELD_NAME,
    methods = DEFAULT_CSRF_METHODS,
    excludePaths = [],
  } = options

  return async (request, next) => {
    // Skip if method doesn't require CSRF validation
    if (!methods.includes(request.method)) {
      return next()
    }

    // Skip excluded paths
    const url = new URL(request.url)
    if (excludePaths.some((path) => url.pathname.startsWith(path))) {
      return next()
    }

    // Get token from cookie
    const cookieToken = getCsrfTokenFromCookie(request, cookieName)
    if (!cookieToken) {
      return Response.json(
        { error: 'Missing CSRF token cookie' },
        { status: 403 }
      )
    }

    // Get token from header or form body
    let requestToken = getCsrfTokenFromHeader(request, headerName)

    // If not in header, check form body
    if (!requestToken) {
      requestToken = await getCsrfTokenFromFormBody(request, formFieldName)
    }

    if (!requestToken) {
      return Response.json(
        { error: 'Missing CSRF token in request' },
        { status: 403 }
      )
    }

    // Compare tokens using timing-safe comparison
    if (!verifyCsrfToken(cookieToken, requestToken)) {
      return Response.json(
        { error: 'Invalid CSRF token' },
        { status: 403 }
      )
    }

    return next()
  }
}
