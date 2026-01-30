/**
 * @cloudwerk/auth - Middleware Type Definitions
 *
 * Types for auth middleware configuration and options.
 */

import type {
  CookieSessionStore,
  Session,
  SessionAdapter,
  User,
  UserAdapter,
} from '../types.js'

// ============================================================================
// Core Auth Middleware Types
// ============================================================================

/**
 * Configuration for the core auth middleware.
 *
 * The core auth middleware runs on all routes to validate sessions
 * and populate auth context for downstream handlers.
 *
 * @example
 * ```typescript
 * import { createCoreAuthMiddleware } from '@cloudwerk/auth/middleware'
 * import { createKVSessionAdapter } from '@cloudwerk/auth/session'
 *
 * // Database strategy with KV sessions
 * const authMiddleware = createCoreAuthMiddleware({
 *   strategy: 'database',
 *   sessionAdapter: createKVSessionAdapter({ binding: env.AUTH_SESSIONS }),
 * })
 * ```
 *
 * @example
 * ```typescript
 * // JWT strategy with cookie sessions
 * const authMiddleware = createCoreAuthMiddleware({
 *   strategy: 'jwt',
 *   cookieStore: createCookieSessionStore({ secret: env.SESSION_SECRET }),
 * })
 * ```
 */
export interface CoreAuthMiddlewareConfig {
  /**
   * Session strategy to use.
   * - `'database'`: Server-side sessions stored in KV/D1 (requires sessionAdapter)
   * - `'jwt'`: Stateless JWT sessions stored in cookies (requires cookieStore)
   */
  strategy: 'database' | 'jwt'

  /**
   * Session storage adapter for 'database' strategy.
   * Required when strategy is 'database'.
   */
  sessionAdapter?: SessionAdapter

  /**
   * Cookie session store for 'jwt' strategy.
   * Required when strategy is 'jwt'.
   */
  cookieStore?: CookieSessionStore

  /**
   * User adapter for fetching full user data.
   * If not provided, a minimal user object with just the ID is used.
   */
  userAdapter?: UserAdapter

  /**
   * Name of the session cookie.
   * @default 'cloudwerk.session-token'
   */
  cookieName?: string

  /**
   * Callback to enrich or transform session/user data on each request.
   * Called after session validation and user lookup.
   *
   * @example
   * ```typescript
   * onSession: async ({ session, user, request }) => {
   *   // Add request-specific data
   *   return {
   *     user: { ...user, requestedAt: new Date() },
   *   }
   * }
   * ```
   */
  onSession?: (params: OnSessionParams) => Promise<OnSessionResult | void>

  /**
   * Whether to automatically refresh sessions nearing expiration.
   * @default true
   */
  autoRefresh?: boolean

  /**
   * Custom auth page paths.
   */
  pages?: {
    /**
     * Sign-in page path for unauthenticated redirects.
     * @default '/auth/signin'
     */
    signIn?: string
  }
}

/**
 * Parameters passed to the onSession callback.
 */
export interface OnSessionParams {
  /** The validated session */
  session: Session
  /** The loaded user (may be minimal if no userAdapter) */
  user: User
  /** The current request */
  request: Request
}

/**
 * Result from the onSession callback.
 */
export interface OnSessionResult {
  /** Updated session data */
  session?: Session
  /** Updated user data */
  user?: User
}

// ============================================================================
// Route Protection Middleware Types
// ============================================================================

/**
 * Options for the route protection middleware.
 *
 * @example
 * ```typescript
 * import { authMiddleware } from '@cloudwerk/auth/middleware'
 *
 * // Require authentication
 * export const middleware = authMiddleware()
 *
 * // Require specific role
 * export const middleware = authMiddleware({ role: 'admin' })
 *
 * // Custom authorization
 * export const middleware = authMiddleware({
 *   authorize: (user, request) => user.data?.orgId === getOrgId(request),
 * })
 * ```
 */
export interface AuthMiddlewareOptions {
  /**
   * Single role required to access the route.
   * User must have this role in their roles array.
   */
  role?: string

  /**
   * Multiple roles where any one grants access.
   * User must have at least one of these roles.
   */
  roles?: string[]

  /**
   * Custom authorization function.
   * Called after role checks pass (or if no role requirements).
   * Return true to allow access, false to deny.
   *
   * @example
   * ```typescript
   * authorize: async (user, request) => {
   *   const resourceId = new URL(request.url).pathname.split('/')[2]
   *   return user.data?.resources?.includes(resourceId)
   * }
   * ```
   */
  authorize?: (user: User, request: Request) => boolean | Promise<boolean>

  /**
   * URL to redirect unauthenticated users to.
   * A `returnTo` query parameter is added with the current path.
   * @default '/login'
   */
  unauthenticatedRedirect?: string

  /**
   * URL to redirect unauthorized (authenticated but lacking permissions) users to.
   * If not set, a 403 response is returned instead of redirecting.
   */
  unauthorizedRedirect?: string

  /**
   * Return JSON error responses instead of redirecting.
   * Useful for API routes.
   * @default false
   */
  json?: boolean
}

// ============================================================================
// CSRF Middleware Types
// ============================================================================

/**
 * Options for the CSRF protection middleware.
 *
 * @example
 * ```typescript
 * import { csrfMiddleware } from '@cloudwerk/auth/middleware'
 *
 * // Default configuration
 * export const middleware = csrfMiddleware()
 *
 * // Custom configuration
 * export const middleware = csrfMiddleware({
 *   excludePaths: ['/api/webhooks'],
 *   methods: ['POST', 'DELETE'],
 * })
 * ```
 */
export interface CSRFMiddlewareOptions {
  /**
   * Name of the CSRF cookie.
   * @default 'cloudwerk.csrf-token'
   */
  cookieName?: string

  /**
   * Name of the header that must contain the CSRF token.
   * @default 'X-CSRF-Token'
   */
  headerName?: string

  /**
   * Name of the form field that can contain the CSRF token.
   * Used as an alternative to the header for traditional form submissions.
   * @default 'csrf_token'
   */
  formFieldName?: string

  /**
   * HTTP methods that require CSRF validation.
   * Safe methods (GET, HEAD, OPTIONS) are always excluded.
   * @default ['POST', 'PUT', 'PATCH', 'DELETE']
   */
  methods?: string[]

  /**
   * URL path patterns to exclude from CSRF protection.
   * Useful for webhook endpoints that receive external requests.
   *
   * @example
   * ```typescript
   * excludePaths: ['/api/webhooks/stripe', '/api/webhooks/github']
   * ```
   */
  excludePaths?: string[]
}

/**
 * Options for setting the CSRF cookie.
 */
export interface SetCsrfCookieOptions {
  /**
   * Name of the CSRF cookie.
   * @default 'cloudwerk.csrf-token'
   */
  cookieName?: string

  /**
   * Cookie path.
   * @default '/'
   */
  path?: string

  /**
   * Whether the cookie is HTTP-only.
   * Must be false to allow JavaScript access for SPA frameworks.
   * @default false
   */
  httpOnly?: boolean

  /**
   * Whether the cookie requires HTTPS.
   * @default true
   */
  secure?: boolean

  /**
   * SameSite attribute.
   * @default 'lax'
   */
  sameSite?: 'strict' | 'lax' | 'none'

  /**
   * Max age in seconds.
   * @default 86400 (24 hours)
   */
  maxAge?: number
}
