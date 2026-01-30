/**
 * @cloudwerk/auth
 *
 * Authentication and session management for Cloudwerk.
 */

export * from './types.js'

// ============================================================================
// Error Classes
// ============================================================================

export {
  UnauthenticatedError,
  ForbiddenError,
  InvalidCredentialsError,
  SessionExpiredError,
} from './errors.js'

// ============================================================================
// Context Helpers
// ============================================================================

export {
  // Non-throwing helpers
  getUser,
  getSession,
  isAuthenticated,
  hasRole,
  hasPermission,
  getAuthContext,

  // Throwing helpers
  requireAuth,
  requireRole,
  requireAnyRole,
  requirePermission,

  // Context setup (for middleware)
  setAuthContext,
  setAuthConfig,

  // Context keys (for advanced use)
  AUTH_USER_KEY,
  AUTH_SESSION_KEY,
  AUTH_CONFIG_KEY,

  // Option types
  type RequireAuthOptions,
  type RequireRoleOptions,
} from './context.js'

// ============================================================================
// Session Utilities
// ============================================================================

// Re-export commonly used session utilities from main entry
export {
  createKVSessionAdapter,
  createCookieSessionStore,
  createSessionManager,
} from './session/index.js'

// ============================================================================
// Middleware
// ============================================================================

export {
  // Core auth middleware
  createCoreAuthMiddleware,

  // Route protection middleware
  authMiddleware,

  // CSRF middleware
  csrfMiddleware,
  generateCsrfToken,
  setCsrfCookie,

  // Middleware types
  type AuthMiddlewareOptions,
  type CoreAuthMiddlewareConfig,
  type CSRFMiddlewareOptions,
  type OnSessionParams,
  type OnSessionResult,
  type SetCsrfCookieOptions,
} from './middleware/index.js'

// ============================================================================
// Password Utilities
// ============================================================================

export { hashPassword, verifyPassword } from './password/index.js'
