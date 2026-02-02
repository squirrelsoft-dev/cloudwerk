/**
 * @cloudwerk/security - Main Entry Point
 *
 * Comprehensive security middleware for Cloudwerk applications.
 * Provides CSRF protection, security headers, CSP, origin validation,
 * and X-Requested-With validation.
 *
 * @example
 * ```typescript
 * // Import the combined security middleware
 * import { securityMiddleware } from '@cloudwerk/security/middleware'
 *
 * export const middleware = securityMiddleware({
 *   allowedOrigins: ['https://myapp.com'],
 *   csrf: {
 *     excludePaths: ['/api/webhooks'],
 *   },
 * })
 * ```
 *
 * @example
 * ```typescript
 * // Import specific middleware
 * import {
 *   csrfMiddleware,
 *   securityHeadersMiddleware,
 *   cspMiddleware,
 * } from '@cloudwerk/security/middleware'
 *
 * export const middleware = csrfMiddleware()
 * ```
 *
 * @example
 * ```typescript
 * // Client-side helpers
 * import { secureFetch, getCsrfToken } from '@cloudwerk/security/client'
 *
 * const response = await secureFetch('/api/users', {
 *   method: 'POST',
 *   body: JSON.stringify({ name: 'Alice' }),
 * })
 * ```
 */

// ============================================================================
// CSRF
// ============================================================================

export {
  csrfMiddleware,
  generateCsrfToken,
  setCsrfCookie,
  getCsrfTokenFromCookie,
  getCsrfTokenFromHeader,
  getCsrfTokenFromFormBody,
  verifyCsrfToken,
  rotateCsrfToken,
  DEFAULT_CSRF_COOKIE_NAME,
  DEFAULT_CSRF_HEADER_NAME,
  DEFAULT_CSRF_FORM_FIELD_NAME,
} from './csrf/index.js'

// ============================================================================
// Security Headers
// ============================================================================

export {
  securityHeadersMiddleware,
  cspMiddleware,
  generateCSPHeader,
  generateNonce,
} from './headers/index.js'

// ============================================================================
// Origin Validation
// ============================================================================

export { originValidationMiddleware } from './origin/index.js'

// ============================================================================
// X-Requested-With
// ============================================================================

export { requestedWithMiddleware } from './request/index.js'

// ============================================================================
// Combined Middleware
// ============================================================================

export { securityMiddleware, composeMiddleware } from './combined/index.js'

// ============================================================================
// Types
// ============================================================================

export type {
  CookieAttributes,
  CSRFMiddlewareOptions,
  SetCsrfCookieOptions,
  SecurityHeadersOptions,
  CSPOptions,
  CSPDirectives,
  CSPDirectiveValue,
  OriginValidationOptions,
  RequestedWithOptions,
  SecurityMiddlewareOptions,
  SecureFetchOptions,
} from './types.js'
