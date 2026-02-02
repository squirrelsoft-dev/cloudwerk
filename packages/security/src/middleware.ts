/**
 * @cloudwerk/security - Middleware Entry Point
 *
 * Convenient import path for all middleware functions.
 *
 * @example
 * ```typescript
 * import { securityMiddleware, csrfMiddleware } from '@cloudwerk/security/middleware'
 *
 * // Use combined middleware with all protections
 * export const middleware = securityMiddleware()
 *
 * // Or use individual middleware
 * export const middleware = csrfMiddleware()
 * ```
 */

// Re-export everything from main index
export * from './index.js'
