/**
 * @cloudwerk/auth - Middleware Module
 *
 * Auth middleware for session validation, route protection, and CSRF.
 *
 * @example
 * ```typescript
 * // Set up core auth middleware at the root
 * // app/middleware.ts
 * import { createCoreAuthMiddleware } from '@cloudwerk/auth/middleware'
 * import { createKVSessionAdapter } from '@cloudwerk/auth/session'
 *
 * export const middleware = createCoreAuthMiddleware({
 *   strategy: 'database',
 *   sessionAdapter: createKVSessionAdapter({ binding: env.AUTH_SESSIONS }),
 *   pages: { signIn: '/login' },
 * })
 * ```
 *
 * @example
 * ```typescript
 * // Protect specific routes
 * // app/admin/middleware.ts
 * import { authMiddleware } from '@cloudwerk/auth/middleware'
 *
 * export const middleware = authMiddleware({ role: 'admin' })
 * ```
 *
 * @example
 * ```typescript
 * // Add CSRF protection
 * // app/api/middleware.ts
 * import { csrfMiddleware } from '@cloudwerk/auth/middleware'
 *
 * export const middleware = csrfMiddleware({
 *   excludePaths: ['/api/webhooks'],
 * })
 * ```
 */

// ============================================================================
// Core Auth Middleware
// ============================================================================

export { createCoreAuthMiddleware } from './core-auth.js'

// ============================================================================
// Route Protection Middleware
// ============================================================================

export { authMiddleware } from './auth.js'

// ============================================================================
// CSRF Middleware
// ============================================================================

export {
  csrfMiddleware,
  generateCsrfToken,
  setCsrfCookie,
} from './csrf.js'

// ============================================================================
// Types
// ============================================================================

export type {
  AuthMiddlewareOptions,
  CoreAuthMiddlewareConfig,
  CSRFMiddlewareOptions,
  OnSessionParams,
  OnSessionResult,
  SetCsrfCookieOptions,
} from './types.js'
