/**
 * @cloudwerk/security - Cookie Utilities
 *
 * Utilities for parsing and serializing cookies.
 */

import type { CookieAttributes } from '../types.js'

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
