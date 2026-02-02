/**
 * @cloudwerk/auth - CSRF Protection Middleware
 *
 * @deprecated CSRF protection has moved to @cloudwerk/security.
 * Import from '@cloudwerk/security' or '@cloudwerk/security/middleware' instead.
 *
 * This module re-exports from @cloudwerk/security for backward compatibility.
 * It will be removed in a future major version.
 *
 * @example
 * ```typescript
 * // Before (deprecated)
 * import { csrfMiddleware, generateCsrfToken } from '@cloudwerk/auth/middleware'
 *
 * // After (recommended)
 * import { csrfMiddleware, generateCsrfToken } from '@cloudwerk/security'
 * // or
 * import { csrfMiddleware, generateCsrfToken } from '@cloudwerk/security/middleware'
 * ```
 */

// Log deprecation warning once
let hasWarned = false
function warnDeprecation() {
  if (!hasWarned) {
    console.warn(
      '[@cloudwerk/auth] CSRF imports from @cloudwerk/auth are deprecated. ' +
      'Please migrate to @cloudwerk/security. See: https://cloudwerk.dev/docs/migration/security'
    )
    hasWarned = true
  }
}

// Re-export from @cloudwerk/security with deprecation wrapper
import {
  csrfMiddleware as _csrfMiddleware,
  generateCsrfToken as _generateCsrfToken,
  setCsrfCookie as _setCsrfCookie,
  rotateCsrfToken as _rotateCsrfToken,
  verifyCsrfToken as _verifyCsrfToken,
} from '@cloudwerk/security'

import type { Middleware } from '@cloudwerk/core'
import type { CSRFMiddlewareOptions, SetCsrfCookieOptions } from './types.js'

/**
 * @deprecated Use `csrfMiddleware` from '@cloudwerk/security' instead.
 */
export function csrfMiddleware(options?: CSRFMiddlewareOptions): Middleware {
  warnDeprecation()
  return _csrfMiddleware(options)
}

/**
 * @deprecated Use `generateCsrfToken` from '@cloudwerk/security' instead.
 */
export function generateCsrfToken(): string {
  warnDeprecation()
  return _generateCsrfToken()
}

/**
 * @deprecated Use `setCsrfCookie` from '@cloudwerk/security' instead.
 */
export function setCsrfCookie(
  response: Response,
  token: string,
  options?: SetCsrfCookieOptions
): Response {
  warnDeprecation()
  return _setCsrfCookie(response, token, options)
}

/**
 * @deprecated Use `rotateCsrfToken` from '@cloudwerk/security' instead.
 */
export function rotateCsrfToken(
  response: Response,
  options?: SetCsrfCookieOptions
): Response {
  warnDeprecation()
  return _rotateCsrfToken(response, options)
}

/**
 * @deprecated Use `verifyCsrfToken` from '@cloudwerk/security' instead.
 */
export function verifyCsrfToken(cookieToken: string, requestToken: string): boolean {
  warnDeprecation()
  return _verifyCsrfToken(cookieToken, requestToken)
}
