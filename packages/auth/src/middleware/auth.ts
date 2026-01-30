/**
 * @cloudwerk/auth - Route Protection Middleware
 *
 * Protects routes by requiring authentication and/or specific roles.
 * Should be used after createCoreAuthMiddleware has populated auth context.
 */

import type { Middleware } from '@cloudwerk/core'
import { getUser, hasRole } from '../context.js'
import type { User } from '../types.js'
import type { AuthMiddlewareOptions } from './types.js'

// ============================================================================
// Constants
// ============================================================================

/** Default redirect URL for unauthenticated users */
const DEFAULT_UNAUTHENTICATED_REDIRECT = '/login'

// ============================================================================
// Middleware Factory
// ============================================================================

/**
 * Create route protection middleware.
 *
 * This middleware protects routes by checking:
 * 1. Authentication - user must be logged in
 * 2. Roles - user must have required role(s)
 * 3. Custom authorization - custom logic for access control
 *
 * Must be used after createCoreAuthMiddleware has run to populate auth context.
 *
 * @param options - Middleware configuration options
 * @returns Middleware function
 *
 * @example
 * ```typescript
 * // Require authentication only
 * import { authMiddleware } from '@cloudwerk/auth/middleware'
 *
 * export const middleware = authMiddleware()
 * ```
 *
 * @example
 * ```typescript
 * // Require specific role
 * export const middleware = authMiddleware({
 *   role: 'admin',
 * })
 * ```
 *
 * @example
 * ```typescript
 * // Require any of multiple roles
 * export const middleware = authMiddleware({
 *   roles: ['admin', 'moderator'],
 * })
 * ```
 *
 * @example
 * ```typescript
 * // Custom authorization logic
 * export const middleware = authMiddleware({
 *   authorize: async (user, request) => {
 *     const orgId = new URL(request.url).searchParams.get('org')
 *     return user.data?.organizations?.includes(orgId)
 *   },
 * })
 * ```
 *
 * @example
 * ```typescript
 * // API route with JSON responses
 * export const middleware = authMiddleware({
 *   json: true,
 *   role: 'api-user',
 * })
 * ```
 */
export function authMiddleware(options: AuthMiddlewareOptions = {}): Middleware {
  const {
    role,
    roles,
    authorize,
    unauthenticatedRedirect = DEFAULT_UNAUTHENTICATED_REDIRECT,
    unauthorizedRedirect,
    json = false,
  } = options

  return async (request, next) => {
    const user = getUser()

    // Check authentication
    if (!user) {
      return handleUnauthenticated(request, {
        json,
        redirectUrl: unauthenticatedRedirect,
      })
    }

    // Check single role requirement
    if (role && !hasRole(role)) {
      return handleUnauthorized(request, {
        json,
        redirectUrl: unauthorizedRedirect,
        message: `Role '${role}' required`,
        required: role,
      })
    }

    // Check multiple roles (user needs at least one)
    if (roles?.length && !roles.some((r) => hasRole(r))) {
      return handleUnauthorized(request, {
        json,
        redirectUrl: unauthorizedRedirect,
        message: `One of roles [${roles.join(', ')}] required`,
        required: roles.join('|'),
      })
    }

    // Check custom authorization
    if (authorize) {
      const authorized = await authorize(user as User, request)
      if (!authorized) {
        return handleUnauthorized(request, {
          json,
          redirectUrl: unauthorizedRedirect,
          message: 'Access denied',
        })
      }
    }

    return next()
  }
}

// ============================================================================
// Response Helpers
// ============================================================================

interface UnauthenticatedOptions {
  json: boolean
  redirectUrl: string
}

interface UnauthorizedOptions {
  json: boolean
  redirectUrl?: string
  message: string
  required?: string
}

/**
 * Handle unauthenticated request - redirect to login or return 401.
 */
function handleUnauthenticated(
  request: Request,
  options: UnauthenticatedOptions
): Response {
  const { json, redirectUrl } = options

  if (json) {
    return Response.json(
      { error: 'Authentication required' },
      { status: 401 }
    )
  }

  // Build redirect URL with returnTo parameter
  const url = new URL(request.url)
  const returnTo = url.pathname + url.search
  const redirectTarget = `${redirectUrl}?returnTo=${encodeURIComponent(returnTo)}`

  return Response.redirect(new URL(redirectTarget, request.url).href, 302)
}

/**
 * Handle unauthorized request - redirect or return 403.
 */
function handleUnauthorized(
  request: Request,
  options: UnauthorizedOptions
): Response {
  const { json, redirectUrl, message, required } = options

  if (json) {
    const body: Record<string, unknown> = { error: message }
    if (required) body.required = required
    return Response.json(body, { status: 403 })
  }

  if (redirectUrl) {
    return Response.redirect(new URL(redirectUrl, request.url).href, 302)
  }

  return new Response(message, { status: 403 })
}
