/**
 * @cloudwerk/auth - CSRF Route Handler
 *
 * GET /auth/csrf - Returns a CSRF token for form submissions.
 */

import type { AuthRouteContext, CSRFResponse } from '../types.js'
import { generateUrlSafeToken } from '../../password/token.js'

/**
 * Cookie name for CSRF token.
 */
const CSRF_COOKIE_NAME = '__Host-cloudwerk.csrf-token'

/**
 * Handle GET /auth/csrf request.
 *
 * Returns a CSRF token that must be included in POST/PUT/DELETE requests.
 * The token is also set as an HttpOnly cookie for double-submit verification.
 *
 * @param ctx - Auth route context
 * @returns JSON response with CSRF token
 */
export async function handleCSRF(
  ctx: AuthRouteContext
): Promise<Response> {
  // Generate a new CSRF token
  const csrfToken = generateUrlSafeToken()

  const response: CSRFResponse = {
    csrfToken,
  }

  // Set CSRF token as HttpOnly cookie
  const cookieOptions = [
    `${CSRF_COOKIE_NAME}=${csrfToken}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
  ]

  // Add Secure flag if not localhost
  if (!ctx.url.hostname.includes('localhost') && ctx.url.protocol === 'https:') {
    cookieOptions.push('Secure')
  }

  const headers = new Headers({
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store, max-age=0',
    'Set-Cookie': cookieOptions.join('; '),
    ...Object.fromEntries(ctx.responseHeaders),
  })

  return new Response(JSON.stringify(response), {
    status: 200,
    headers,
  })
}

/**
 * Verify a CSRF token from request.
 *
 * Compares the token from the request body/header with the cookie.
 *
 * @param request - The request to verify
 * @param tokenFromBody - Token submitted in form/JSON body
 * @returns True if token is valid
 */
export function verifyCSRFToken(
  request: Request,
  tokenFromBody: string
): boolean {
  // Get token from cookie
  const cookies = request.headers.get('Cookie') ?? ''
  const match = cookies.match(new RegExp(`${CSRF_COOKIE_NAME}=([^;]+)`))
  const tokenFromCookie = match?.[1]

  if (!tokenFromCookie || !tokenFromBody) {
    return false
  }

  // Timing-safe comparison
  return timingSafeEqual(tokenFromCookie, tokenFromBody)
}

/**
 * Timing-safe string comparison.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }

  return result === 0
}

/**
 * Extract CSRF token from request.
 *
 * Checks both form data and JSON body for csrfToken field,
 * and also checks X-CSRF-Token header.
 *
 * @param request - The request to extract from
 * @returns The CSRF token or null
 */
export async function extractCSRFToken(request: Request): Promise<string | null> {
  // Check header first
  const headerToken = request.headers.get('X-CSRF-Token')
  if (headerToken) {
    return headerToken
  }

  // Check body
  const contentType = request.headers.get('Content-Type') ?? ''

  if (contentType.includes('application/json')) {
    try {
      const body = await request.clone().json()
      return body.csrfToken ?? null
    } catch {
      return null
    }
  }

  if (contentType.includes('application/x-www-form-urlencoded')) {
    try {
      const formData = await request.clone().formData()
      return formData.get('csrfToken')?.toString() ?? null
    } catch {
      return null
    }
  }

  return null
}
