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
  generateCsrfToken,
  getCsrfTokenFromCookie,
  getCsrfTokenFromHeader,
  getCsrfTokenFromFormBody,
  verifyCsrfToken,
  setCsrfCookie,
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
    const existingToken = getCsrfTokenFromCookie(request, cookieName)
    const isMutationMethod = methods.includes(request.method)

    // For safe methods (GET, HEAD, OPTIONS), set the cookie if missing
    if (!isMutationMethod) {
      const response = await next()

      // If no CSRF cookie exists, set one on the response
      // This ensures users get a token on their first request
      if (!existingToken) {
        const newToken = generateCsrfToken()
        return setCsrfCookie(response, newToken, { cookieName })
      }

      return response
    }

    // For mutation methods, we need to validate the CSRF token

    // Skip excluded paths
    const url = new URL(request.url)
    if (excludePaths.some((path) => url.pathname.startsWith(path))) {
      return next()
    }

    // Reject if no CSRF cookie (client never received a token)
    if (!existingToken) {
      return Response.json(
        { error: 'Missing CSRF token cookie' },
        { status: 403 }
      )
    }

    // Get token from header first, then fall back to form body
    let requestToken = getCsrfTokenFromHeader(request, headerName)

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
    if (!verifyCsrfToken(existingToken, requestToken)) {
      return Response.json(
        { error: 'Invalid CSRF token' },
        { status: 403 }
      )
    }

    return next()
  }
}
