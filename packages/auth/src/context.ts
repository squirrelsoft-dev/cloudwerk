/**
 * @cloudwerk/auth - Context Helpers
 *
 * Auth context helpers that leverage the AsyncLocalStorage-based context system
 * from @cloudwerk/core. These helpers provide clean access to auth state anywhere
 * in the request lifecycle (routes, loaders, middleware, actions).
 */

import { getContext, RedirectError } from '@cloudwerk/core'
import type { AuthConfig, AuthContext, RBACConfig, Session, User } from './types.js'
import { ForbiddenError, UnauthenticatedError } from './errors.js'

// ============================================================================
// Context Keys
// ============================================================================

/** Key for storing current user in context */
export const AUTH_USER_KEY = 'auth:user'

/** Key for storing current session in context */
export const AUTH_SESSION_KEY = 'auth:session'

/** Key for storing auth configuration in context */
export const AUTH_CONFIG_KEY = 'auth:config'

// ============================================================================
// Options Types
// ============================================================================

/**
 * Options for requireAuth and similar functions.
 */
export interface RequireAuthOptions {
  /**
   * URL to redirect to when not authenticated.
   * Defaults to config.pages?.signIn or '/auth/signin'.
   */
  redirectTo?: string

  /**
   * Whether to throw UnauthenticatedError instead of RedirectError.
   * Useful for API routes where redirects don't make sense.
   * @default false
   */
  throwError?: boolean

  /**
   * Custom error message for the thrown error.
   */
  message?: string
}

/**
 * Options for requireRole and requirePermission.
 */
export interface RequireRoleOptions {
  /**
   * Custom error message for the ForbiddenError.
   */
  message?: string
}

// ============================================================================
// Non-Throwing Helpers
// ============================================================================

/**
 * Get the current authenticated user.
 *
 * Returns `null` if not authenticated. Use `requireAuth()` for a throwing version.
 *
 * @returns The current user or null
 *
 * @example
 * ```typescript
 * import { getUser } from '@cloudwerk/auth'
 *
 * export async function loader() {
 *   const user = getUser()
 *   if (user) {
 *     return { greeting: `Hello, ${user.name}` }
 *   }
 *   return { greeting: 'Hello, guest' }
 * }
 * ```
 */
export function getUser<T = User>(): T | null {
  const ctx = getContext()
  return ctx.get<T>(AUTH_USER_KEY) ?? null
}

/**
 * Get the current session.
 *
 * Returns `null` if not authenticated. Use `requireAuth()` for a throwing version.
 *
 * @returns The current session or null
 *
 * @example
 * ```typescript
 * import { getSession } from '@cloudwerk/auth'
 *
 * export async function loader() {
 *   const session = getSession()
 *   if (session) {
 *     return { sessionId: session.id }
 *   }
 *   return { sessionId: null }
 * }
 * ```
 */
export function getSession<T = Session>(): T | null {
  const ctx = getContext()
  return ctx.get<T>(AUTH_SESSION_KEY) ?? null
}

/**
 * Check if the current request is authenticated.
 *
 * @returns True if a user session exists
 *
 * @example
 * ```typescript
 * import { isAuthenticated } from '@cloudwerk/auth'
 *
 * export function GET() {
 *   if (isAuthenticated()) {
 *     return json({ status: 'logged in' })
 *   }
 *   return json({ status: 'guest' })
 * }
 * ```
 */
export function isAuthenticated(): boolean {
  return getUser() !== null
}

/**
 * Check if the current user has a specific role.
 *
 * Returns `false` if not authenticated or the role is not present.
 * For a throwing version, use `requireRole()`.
 *
 * @param role - The role to check for
 * @returns True if the user has the role
 *
 * @example
 * ```typescript
 * import { hasRole } from '@cloudwerk/auth'
 *
 * export function GET() {
 *   const canEdit = hasRole('editor')
 *   return json({ canEdit })
 * }
 * ```
 */
export function hasRole(role: string): boolean {
  const user = getUser<User<RBACConfig>>()
  if (!user?.data?.roles) return false
  return user.data.roles.includes(role)
}

/**
 * Check if the current user has a specific permission.
 *
 * Checks both direct permissions and role-based permissions.
 * Returns `false` if not authenticated or the permission is not present.
 * For a throwing version, use `requirePermission()`.
 *
 * @param permission - The permission to check for
 * @returns True if the user has the permission
 *
 * @example
 * ```typescript
 * import { hasPermission } from '@cloudwerk/auth'
 *
 * export function DELETE(request: Request, { params }) {
 *   if (!hasPermission('posts:delete')) {
 *     return json({ error: 'Cannot delete posts' }, { status: 403 })
 *   }
 *   // Delete logic...
 * }
 * ```
 */
export function hasPermission(permission: string): boolean {
  const user = getUser<User<RBACConfig>>()
  if (!user?.data) return false

  // Check direct permissions
  if (user.data.permissions?.includes(permission)) {
    return true
  }

  // Check role-based permissions
  if (user.data.roles && user.data.rolePermissions) {
    for (const role of user.data.roles) {
      const rolePerms = user.data.rolePermissions[role]
      if (rolePerms?.includes(permission)) {
        return true
      }
    }
  }

  return false
}

/**
 * Get the full auth context with user, session, and helper methods.
 *
 * @returns The auth context object
 *
 * @example
 * ```typescript
 * import { getAuthContext } from '@cloudwerk/auth'
 *
 * export function GET() {
 *   const auth = getAuthContext()
 *   if (auth.isAuthenticated) {
 *     return json({ user: auth.user })
 *   }
 *   return json({ user: null })
 * }
 * ```
 */
export function getAuthContext<TUser = User, TSession = Session>(): AuthContext<TUser, TSession> {
  const user = getUser<TUser>()
  const session = getSession<TSession>()

  return {
    session,
    user,
    isAuthenticated: user !== null,
    getSession: () => {
      if (!session) {
        throw new UnauthenticatedError()
      }
      return session
    },
    getUser: () => {
      if (!user) {
        throw new UnauthenticatedError()
      }
      return user
    },
  }
}

// ============================================================================
// Throwing Helpers
// ============================================================================

/**
 * Require authentication. Throws if not authenticated.
 *
 * By default, throws `RedirectError` to the sign-in page (suitable for page loaders).
 * Use `{ throwError: true }` to throw `UnauthenticatedError` instead (suitable for API routes).
 *
 * @param options - Options for redirect behavior
 * @returns The current user
 * @throws {RedirectError} If not authenticated (default)
 * @throws {UnauthenticatedError} If not authenticated and `throwError: true`
 *
 * @example
 * ```typescript
 * // In a page loader - redirects to sign-in
 * import { requireAuth } from '@cloudwerk/auth'
 *
 * export async function loader() {
 *   const user = requireAuth() // Redirects if not logged in
 *   return { user }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // In an API route - throws error
 * import { requireAuth } from '@cloudwerk/auth'
 *
 * export function GET() {
 *   const user = requireAuth({ throwError: true })
 *   return json({ user })
 * }
 * ```
 */
export function requireAuth<T = User>(options?: RequireAuthOptions): T {
  const user = getUser<T>()

  if (!user) {
    if (options?.throwError) {
      throw new UnauthenticatedError(options?.message)
    }

    // Get sign-in URL from config or use default
    const ctx = getContext()
    const config = ctx.get<AuthConfig>(AUTH_CONFIG_KEY)
    const signInUrl = options?.redirectTo ?? config?.pages?.signIn ?? '/auth/signin'

    // Build callback URL from current request
    const callbackUrl = encodeURIComponent(ctx.request.url)
    const redirectUrl = `${signInUrl}?callbackUrl=${callbackUrl}`

    throw new RedirectError(redirectUrl)
  }

  return user
}

/**
 * Require a specific role. Throws if not authenticated or role not present.
 *
 * @param role - The role to require
 * @param options - Options for error behavior
 * @returns The current user
 * @throws {RedirectError} If not authenticated
 * @throws {ForbiddenError} If authenticated but role not present
 *
 * @example
 * ```typescript
 * import { requireRole } from '@cloudwerk/auth'
 *
 * export async function loader() {
 *   const user = requireRole('admin')
 *   return { adminUser: user }
 * }
 * ```
 */
export function requireRole<T = User>(role: string, options?: RequireRoleOptions): T {
  const user = requireAuth<T>()

  if (!hasRole(role)) {
    throw new ForbiddenError(
      options?.message ?? `Role '${role}' required`,
      { requiredRole: role }
    )
  }

  return user
}

/**
 * Require one of multiple roles. Throws if not authenticated or no matching role.
 *
 * @param roles - The roles to check (user must have at least one)
 * @param options - Options for error behavior
 * @returns The current user
 * @throws {RedirectError} If not authenticated
 * @throws {ForbiddenError} If authenticated but no matching role
 *
 * @example
 * ```typescript
 * import { requireAnyRole } from '@cloudwerk/auth'
 *
 * export async function loader() {
 *   // User must be either admin OR moderator
 *   const user = requireAnyRole(['admin', 'moderator'])
 *   return { user }
 * }
 * ```
 */
export function requireAnyRole<T = User>(roles: string[], options?: RequireRoleOptions): T {
  const user = requireAuth<T>()

  const hasAnyRole = roles.some((role) => hasRole(role))
  if (!hasAnyRole) {
    throw new ForbiddenError(
      options?.message ?? `One of roles [${roles.join(', ')}] required`,
      { requiredRole: roles.join('|') }
    )
  }

  return user
}

/**
 * Require a specific permission. Throws if not authenticated or permission not present.
 *
 * Checks both direct permissions and role-based permissions.
 *
 * @param permission - The permission to require
 * @param options - Options for error behavior
 * @returns The current user
 * @throws {RedirectError} If not authenticated
 * @throws {ForbiddenError} If authenticated but permission not present
 *
 * @example
 * ```typescript
 * import { requirePermission } from '@cloudwerk/auth'
 *
 * export async function action({ params }) {
 *   const user = requirePermission('posts:delete')
 *   // Delete the post...
 * }
 * ```
 */
export function requirePermission<T = User>(
  permission: string,
  options?: RequireRoleOptions
): T {
  const user = requireAuth<T>()

  if (!hasPermission(permission)) {
    throw new ForbiddenError(
      options?.message ?? `Permission '${permission}' required`,
      { requiredPermission: permission }
    )
  }

  return user
}

// ============================================================================
// Context Setup (for middleware)
// ============================================================================

/**
 * Set the auth context for the current request.
 *
 * This is typically called by auth middleware after validating a session.
 * Application code should use `getUser()`, `getSession()`, etc. to access auth state.
 *
 * @param user - The authenticated user (or null)
 * @param session - The current session (or null)
 *
 * @example
 * ```typescript
 * // In auth middleware
 * import { setAuthContext } from '@cloudwerk/auth'
 *
 * export const middleware: Middleware = async (request, next) => {
 *   const session = await validateSession(request)
 *   if (session) {
 *     setAuthContext(session.user, session)
 *   }
 *   return next()
 * }
 * ```
 */
export function setAuthContext<TUser = User, TSession = Session>(
  user: TUser | null,
  session: TSession | null
): void {
  const ctx = getContext()
  ctx.set(AUTH_USER_KEY, user)
  ctx.set(AUTH_SESSION_KEY, session)
}

/**
 * Set the auth configuration in context.
 *
 * This is typically called by auth middleware to make config available
 * to context helpers like `requireAuth()` for redirect URLs.
 *
 * @param config - The auth configuration
 *
 * @example
 * ```typescript
 * // In auth setup
 * import { setAuthConfig } from '@cloudwerk/auth'
 *
 * export const middleware: Middleware = async (request, next) => {
 *   setAuthConfig(authConfig)
 *   return next()
 * }
 * ```
 */
export function setAuthConfig(config: AuthConfig): void {
  const ctx = getContext()
  ctx.set(AUTH_CONFIG_KEY, config)
}
