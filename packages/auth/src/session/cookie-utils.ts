/**
 * Cookie utilities for session management.
 *
 * Provides functions for parsing, serializing, and managing session cookies.
 */

import type { CookieAttributes, SessionCookieConfig } from '../types.js'
import {
  DEFAULT_COOKIE_ATTRIBUTES,
  DEFAULT_SESSION_COOKIE_NAME,
} from './constants.js'

/**
 * Parse a cookie header string into key-value pairs.
 *
 * @param cookieHeader - The Cookie header value
 * @returns Record of cookie names to values
 *
 * @example
 * ```typescript
 * const cookies = parseCookies('session=abc123; theme=dark')
 * // { session: 'abc123', theme: 'dark' }
 * ```
 */
export function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {}

  if (!cookieHeader) {
    return cookies
  }

  const pairs = cookieHeader.split(';')
  for (const pair of pairs) {
    const [name, ...valueParts] = pair.split('=')
    const trimmedName = name?.trim()
    if (trimmedName) {
      // Rejoin in case value contains '='
      const value = valueParts.join('=').trim()
      // Handle quoted values
      cookies[trimmedName] = value.startsWith('"') && value.endsWith('"')
        ? value.slice(1, -1)
        : value
    }
  }

  return cookies
}

/**
 * Serialize a cookie with name, value, and attributes into a Set-Cookie header value.
 *
 * @param name - Cookie name
 * @param value - Cookie value
 * @param attributes - Cookie attributes
 * @returns Set-Cookie header value
 *
 * @example
 * ```typescript
 * const setCookie = serializeCookie('session', 'abc123', {
 *   httpOnly: true,
 *   secure: true,
 *   sameSite: 'lax',
 *   maxAge: 86400,
 *   path: '/',
 * })
 * // "session=abc123; HttpOnly; Secure; SameSite=Lax; Max-Age=86400; Path=/"
 * ```
 */
export function serializeCookie(
  name: string,
  value: string,
  attributes: CookieAttributes = {}
): string {
  const parts: string[] = [`${encodeURIComponent(name)}=${encodeURIComponent(value)}`]

  if (attributes.domain) {
    parts.push(`Domain=${attributes.domain}`)
  }

  if (attributes.path) {
    parts.push(`Path=${attributes.path}`)
  }

  if (attributes.expires) {
    parts.push(`Expires=${attributes.expires.toUTCString()}`)
  }

  if (attributes.maxAge !== undefined) {
    parts.push(`Max-Age=${attributes.maxAge}`)
  }

  if (attributes.httpOnly) {
    parts.push('HttpOnly')
  }

  if (attributes.secure) {
    parts.push('Secure')
  }

  if (attributes.sameSite) {
    const sameSiteValue = attributes.sameSite.charAt(0).toUpperCase() + attributes.sameSite.slice(1)
    parts.push(`SameSite=${sameSiteValue}`)
  }

  return parts.join('; ')
}

/**
 * Extract session token from request cookies.
 *
 * @param request - The incoming request
 * @param config - Session cookie configuration
 * @returns Session token or null if not found
 *
 * @example
 * ```typescript
 * const token = getSessionFromCookie(request)
 * if (token) {
 *   const session = await sessionAdapter.getSession(token)
 * }
 * ```
 */
export function getSessionFromCookie(
  request: Request,
  config?: SessionCookieConfig
): string | null {
  const cookieHeader = request.headers.get('Cookie')
  if (!cookieHeader) {
    return null
  }

  const cookieName = config?.name ?? DEFAULT_SESSION_COOKIE_NAME
  const cookies = parseCookies(cookieHeader)

  return cookies[cookieName] ?? null
}

/**
 * Create a new Response with the session cookie set.
 *
 * If the response already has Set-Cookie headers, the new cookie is appended.
 *
 * @param response - The response to modify
 * @param token - Session token value
 * @param config - Session cookie configuration
 * @returns New response with Set-Cookie header
 *
 * @example
 * ```typescript
 * const response = new Response('OK')
 * const withCookie = setSessionCookie(response, sessionToken, {
 *   name: 'my-session',
 *   attributes: { maxAge: 86400 },
 * })
 * ```
 */
export function setSessionCookie(
  response: Response,
  token: string,
  config?: SessionCookieConfig & { maxAge?: number }
): Response {
  const cookieName = config?.name ?? DEFAULT_SESSION_COOKIE_NAME
  const attributes: CookieAttributes = {
    ...DEFAULT_COOKIE_ATTRIBUTES,
    ...config?.attributes,
  }

  // Add maxAge if provided
  if (config?.maxAge !== undefined) {
    attributes.maxAge = config.maxAge
  }

  const cookieValue = serializeCookie(cookieName, token, attributes)

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
 * Create a new Response with the session cookie cleared.
 *
 * Sets the cookie with an empty value and immediate expiration.
 *
 * @param response - The response to modify
 * @param config - Session cookie configuration
 * @returns New response with Set-Cookie header to clear the cookie
 *
 * @example
 * ```typescript
 * const response = new Response('Logged out')
 * const withClearedCookie = clearSessionCookie(response)
 * ```
 */
export function clearSessionCookie(
  response: Response,
  config?: SessionCookieConfig
): Response {
  const cookieName = config?.name ?? DEFAULT_SESSION_COOKIE_NAME
  const attributes: CookieAttributes = {
    ...DEFAULT_COOKIE_ATTRIBUTES,
    ...config?.attributes,
    maxAge: 0,
    expires: new Date(0),
  }

  const cookieValue = serializeCookie(cookieName, '', attributes)

  // Clone response and append cookie
  const headers = new Headers(response.headers)
  headers.append('Set-Cookie', cookieValue)

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}
