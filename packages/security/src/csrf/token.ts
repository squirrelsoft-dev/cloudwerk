/**
 * @cloudwerk/security - CSRF Token Utilities
 *
 * Functions for generating, setting, and verifying CSRF tokens.
 */

import type { SetCsrfCookieOptions } from '../types.js'
import { serializeCookie, parseCookies } from '../utils/cookie.js'
import { timingSafeEqual } from '../utils/timing-safe.js'

// ============================================================================
// Constants
// ============================================================================

/** Default CSRF cookie name */
export const DEFAULT_CSRF_COOKIE_NAME = 'cloudwerk.csrf-token'

/** Default CSRF header name */
export const DEFAULT_CSRF_HEADER_NAME = 'X-CSRF-Token'

/** Default CSRF form field name */
export const DEFAULT_CSRF_FORM_FIELD_NAME = 'csrf_token'

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
 * import { generateCsrfToken } from '@cloudwerk/security'
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
 * import { generateCsrfToken, setCsrfCookie } from '@cloudwerk/security'
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
export function getCsrfTokenFromCookie(
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
export function getCsrfTokenFromHeader(
  request: Request,
  headerName: string = DEFAULT_CSRF_HEADER_NAME
): string | null {
  return request.headers.get(headerName)
}

/**
 * Get the CSRF token from a request's form body.
 *
 * @param request - The request to extract the token from (will be cloned)
 * @param fieldName - The form field name to look for
 * @returns The CSRF token or null if not found
 */
export async function getCsrfTokenFromFormBody(
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
// Token Verification
// ============================================================================

/**
 * Verify a CSRF token against the token in the cookie.
 *
 * Uses timing-safe comparison to prevent timing attacks.
 *
 * @param cookieToken - The token from the cookie
 * @param requestToken - The token from the request (header or form body)
 * @returns True if tokens match
 *
 * @example
 * ```typescript
 * import { verifyCsrfToken, getCsrfTokenFromCookie, getCsrfTokenFromHeader } from '@cloudwerk/security'
 *
 * const cookieToken = getCsrfTokenFromCookie(request)
 * const headerToken = getCsrfTokenFromHeader(request)
 *
 * if (cookieToken && headerToken && verifyCsrfToken(cookieToken, headerToken)) {
 *   // Token is valid
 * }
 * ```
 */
export function verifyCsrfToken(cookieToken: string, requestToken: string): boolean {
  return timingSafeEqual(cookieToken, requestToken)
}

// ============================================================================
// Token Rotation
// ============================================================================

/**
 * Rotate the CSRF token on a response.
 *
 * Generates a new CSRF token and sets it as a cookie. This should be called
 * after successful authentication to bind the CSRF token to the new session
 * and prevent session fixation attacks.
 *
 * @param response - The response to add the new CSRF cookie to
 * @param options - Cookie configuration options
 * @returns A new response with the rotated CSRF token cookie
 *
 * @example
 * ```typescript
 * import { rotateCsrfToken } from '@cloudwerk/security'
 *
 * // After successful login
 * export async function handleLogin(request: Request) {
 *   const user = await validateCredentials(request)
 *   const session = await createSession(user)
 *
 *   let response = createAuthResponse(user, session)
 *   response = rotateCsrfToken(response)
 *   return response
 * }
 * ```
 */
export function rotateCsrfToken(
  response: Response,
  options: SetCsrfCookieOptions = {}
): Response {
  const newToken = generateCsrfToken()
  return setCsrfCookie(response, newToken, options)
}
