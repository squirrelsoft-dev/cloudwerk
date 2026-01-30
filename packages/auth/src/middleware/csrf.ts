/**
 * @cloudwerk/auth - CSRF Protection Middleware
 *
 * Provides CSRF (Cross-Site Request Forgery) protection for mutation requests.
 * Uses the double-submit cookie pattern for stateless CSRF protection.
 */

import type { Middleware } from '@cloudwerk/core'
import { parseCookies, serializeCookie } from '../session/cookie-utils.js'
import type { CSRFMiddlewareOptions, SetCsrfCookieOptions } from './types.js'

// ============================================================================
// Constants
// ============================================================================

/** Default CSRF cookie name */
const DEFAULT_CSRF_COOKIE_NAME = 'cloudwerk.csrf-token'

/** Default CSRF header name */
const DEFAULT_CSRF_HEADER_NAME = 'X-CSRF-Token'

/** Default CSRF form field name */
const DEFAULT_CSRF_FORM_FIELD_NAME = 'csrf_token'

/** Default methods requiring CSRF validation */
const DEFAULT_CSRF_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE']

/** CSRF token length in bytes (32 bytes = 256 bits) */
const CSRF_TOKEN_BYTES = 32

/** Default max age for CSRF cookie (24 hours) */
const DEFAULT_CSRF_MAX_AGE = 24 * 60 * 60

// ============================================================================
// Token Generation
// ============================================================================

/**
 * Generate a cryptographically secure CSRF token.
 *
 * Uses Web Crypto API for secure random number generation.
 *
 * @returns A URL-safe base64-encoded random token
 *
 * @example
 * ```typescript
 * import { generateCsrfToken } from '@cloudwerk/auth/middleware'
 *
 * const token = generateCsrfToken()
 * // 'Yx8nK2pQ...' (43 characters)
 * ```
 */
export function generateCsrfToken(): string {
  const bytes = new Uint8Array(CSRF_TOKEN_BYTES)
  crypto.getRandomValues(bytes)

  // Convert to URL-safe base64
  const base64 = btoa(String.fromCharCode(...bytes))
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// ============================================================================
// Cookie Helpers
// ============================================================================

/**
 * Set a CSRF cookie on a response.
 *
 * Creates a new response with the CSRF cookie set. The cookie is accessible
 * to JavaScript (not httpOnly) so that SPA frameworks can read it and include
 * it in request headers.
 *
 * @param response - The response to add the cookie to
 * @param token - The CSRF token to set (generate with generateCsrfToken())
 * @param options - Cookie configuration options
 * @returns A new response with the Set-Cookie header added
 *
 * @example
 * ```typescript
 * import { generateCsrfToken, setCsrfCookie } from '@cloudwerk/auth/middleware'
 *
 * export function GET(request: Request) {
 *   const token = generateCsrfToken()
 *   const response = new Response(JSON.stringify({ csrfToken: token }))
 *   return setCsrfCookie(response, token)
 * }
 * ```
 */
export function setCsrfCookie(
  response: Response,
  token: string,
  options: SetCsrfCookieOptions = {}
): Response {
  const {
    cookieName = DEFAULT_CSRF_COOKIE_NAME,
    path = '/',
    httpOnly = false, // Must be false to allow JS access
    secure = true,
    sameSite = 'lax',
    maxAge = DEFAULT_CSRF_MAX_AGE,
  } = options

  const cookieValue = serializeCookie(cookieName, token, {
    path,
    httpOnly,
    secure,
    sameSite,
    maxAge,
  })

  // Clone response and append cookie
  const headers = new Headers(response.headers)
  headers.append('Set-Cookie', cookieValue)

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

/**
 * Get the CSRF token from a request's cookie.
 *
 * @param request - The request to extract the token from
 * @param cookieName - The cookie name to look for
 * @returns The CSRF token or null if not found
 */
function getCsrfTokenFromCookie(
  request: Request,
  cookieName: string = DEFAULT_CSRF_COOKIE_NAME
): string | null {
  const cookieHeader = request.headers.get('Cookie')
  if (!cookieHeader) return null

  const cookies = parseCookies(cookieHeader)
  return cookies[cookieName] ?? null
}

/**
 * Get the CSRF token from a request's header.
 *
 * @param request - The request to extract the token from
 * @param headerName - The header name to look for
 * @returns The CSRF token or null if not found
 */
function getCsrfTokenFromHeader(
  request: Request,
  headerName: string = DEFAULT_CSRF_HEADER_NAME
): string | null {
  return request.headers.get(headerName)
}

/**
 * Get the CSRF token from a request's form body.
 *
 * @param request - The request to extract the token from (must be cloned before calling)
 * @param fieldName - The form field name to look for
 * @returns The CSRF token or null if not found
 */
async function getCsrfTokenFromFormBody(
  request: Request,
  fieldName: string = DEFAULT_CSRF_FORM_FIELD_NAME
): Promise<string | null> {
  const contentType = request.headers.get('Content-Type') || ''

  // Only check form data for form submissions
  if (!contentType.includes('application/x-www-form-urlencoded') &&
      !contentType.includes('multipart/form-data')) {
    return null
  }

  try {
    // Clone request to avoid consuming the body
    const clonedRequest = request.clone()
    const formData = await clonedRequest.formData()
    const token = formData.get(fieldName)
    return typeof token === 'string' ? token : null
  } catch {
    return null
  }
}

// ============================================================================
// Middleware
// ============================================================================

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
 * import { csrfMiddleware } from '@cloudwerk/auth/middleware'
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
    if (!timingSafeEqual(cookieToken, requestToken)) {
      return Response.json(
        { error: 'Invalid CSRF token' },
        { status: 403 }
      )
    }

    return next()
  }
}

/**
 * Perform a timing-safe string comparison.
 *
 * This prevents timing attacks by comparing all characters regardless
 * of where differences occur.
 *
 * @param a - First string
 * @param b - Second string
 * @returns True if strings are equal
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }

  // Use XOR to compare without early exit
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }

  return result === 0
}
