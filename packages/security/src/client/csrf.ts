/**
 * @cloudwerk/security - Client-Side CSRF Helpers
 *
 * Utilities for working with CSRF tokens in browser code.
 */

/** Default CSRF cookie name */
const DEFAULT_CSRF_COOKIE_NAME = 'cloudwerk.csrf-token'

/** Default CSRF header name */
const DEFAULT_CSRF_HEADER_NAME = 'X-CSRF-Token'

/**
 * Get the CSRF token from cookies.
 *
 * Reads the CSRF token cookie set by the server.
 *
 * @param cookieName - Name of the CSRF cookie
 * @returns The CSRF token or null if not found
 *
 * @example
 * ```typescript
 * import { getCsrfToken } from '@cloudwerk/security/client'
 *
 * const token = getCsrfToken()
 * if (token) {
 *   // Include token in your request
 *   fetch('/api/users', {
 *     method: 'POST',
 *     headers: {
 *       'X-CSRF-Token': token,
 *     },
 *     body: JSON.stringify(data),
 *   })
 * }
 * ```
 */
export function getCsrfToken(cookieName: string = DEFAULT_CSRF_COOKIE_NAME): string | null {
  if (typeof document === 'undefined') {
    return null
  }

  const cookies = document.cookie.split(';')
  for (const cookie of cookies) {
    const [name, ...valueParts] = cookie.split('=')
    if (name?.trim() === cookieName) {
      const value = valueParts.join('=').trim()
      // Handle URL-encoded cookie values
      try {
        return decodeURIComponent(value)
      } catch {
        return value
      }
    }
  }

  return null
}

/**
 * Add CSRF token to a headers object.
 *
 * Creates a new Headers object with the CSRF token added.
 *
 * @param headers - Existing headers to extend (optional)
 * @param options - Configuration options
 * @returns Headers object with CSRF token added
 *
 * @example
 * ```typescript
 * import { withCsrfToken } from '@cloudwerk/security/client'
 *
 * const headers = withCsrfToken({
 *   'Content-Type': 'application/json',
 * })
 *
 * fetch('/api/users', {
 *   method: 'POST',
 *   headers,
 *   body: JSON.stringify(data),
 * })
 * ```
 */
export function withCsrfToken(
  headers?: HeadersInit,
  options: {
    cookieName?: string
    headerName?: string
  } = {}
): Headers {
  const {
    cookieName = DEFAULT_CSRF_COOKIE_NAME,
    headerName = DEFAULT_CSRF_HEADER_NAME,
  } = options

  const newHeaders = new Headers(headers)

  const token = getCsrfToken(cookieName)
  if (token) {
    newHeaders.set(headerName, token)
  }

  return newHeaders
}

/**
 * Create a hidden input element with the CSRF token.
 *
 * Useful for including CSRF tokens in traditional form submissions.
 *
 * @param fieldName - Name of the form field
 * @param cookieName - Name of the CSRF cookie
 * @returns HTML input element string or empty string if no token
 *
 * @example
 * ```typescript
 * import { csrfInput } from '@cloudwerk/security/client'
 *
 * // In your form template
 * const formHtml = `
 *   <form method="POST" action="/submit">
 *     ${csrfInput()}
 *     <input type="text" name="email" />
 *     <button type="submit">Submit</button>
 *   </form>
 * `
 * ```
 */
export function csrfInput(
  fieldName: string = 'csrf_token',
  cookieName: string = DEFAULT_CSRF_COOKIE_NAME
): string {
  const token = getCsrfToken(cookieName)
  if (!token) {
    return ''
  }

  // Escape HTML entities in token
  const escapedToken = token
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  return `<input type="hidden" name="${fieldName}" value="${escapedToken}" />`
}
