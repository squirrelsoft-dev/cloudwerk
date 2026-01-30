/**
 * @cloudwerk/auth - Core Auth Middleware
 *
 * Validates sessions and populates auth context for downstream handlers.
 * This middleware should run on all routes to enable auth context access.
 */

import type { Middleware } from '@cloudwerk/core'
import { setAuthConfig, setAuthContext } from '../context.js'
import { getSessionFromCookie } from '../session/cookie-utils.js'
import type { AuthConfig, Session, User } from '../types.js'
import type { CoreAuthMiddlewareConfig } from './types.js'

// ============================================================================
// Constants
// ============================================================================

/** Default session cookie name */
const DEFAULT_SESSION_COOKIE_NAME = 'cloudwerk.session-token'

// ============================================================================
// Middleware Factory
// ============================================================================

/**
 * Create the core auth middleware.
 *
 * This middleware runs on all routes and:
 * 1. Extracts the session token from the request cookie
 * 2. Validates the session (JWT decode or database lookup)
 * 3. Optionally fetches the full user from the database
 * 4. Runs the onSession callback for enrichment
 * 5. Sets auth context for downstream handlers
 *
 * @param config - Middleware configuration
 * @returns Middleware function
 *
 * @example
 * ```typescript
 * // In app/middleware.ts (root middleware)
 * import { createCoreAuthMiddleware } from '@cloudwerk/auth/middleware'
 * import { createKVSessionAdapter } from '@cloudwerk/auth/session'
 *
 * export const middleware = createCoreAuthMiddleware({
 *   strategy: 'database',
 *   sessionAdapter: createKVSessionAdapter({
 *     binding: env.AUTH_SESSIONS,
 *   }),
 *   pages: {
 *     signIn: '/login',
 *   },
 * })
 * ```
 *
 * @example
 * ```typescript
 * // JWT strategy with cookie sessions
 * import { createCoreAuthMiddleware } from '@cloudwerk/auth/middleware'
 * import { createCookieSessionStore } from '@cloudwerk/auth/session'
 *
 * export const middleware = createCoreAuthMiddleware({
 *   strategy: 'jwt',
 *   cookieStore: createCookieSessionStore({
 *     secret: env.SESSION_SECRET,
 *   }),
 * })
 * ```
 */
export function createCoreAuthMiddleware(
  config: CoreAuthMiddlewareConfig
): Middleware {
  // Validate configuration
  if (config.strategy === 'database' && !config.sessionAdapter) {
    throw new Error(
      'CoreAuthMiddleware: sessionAdapter is required for database strategy'
    )
  }
  if (config.strategy === 'jwt' && !config.cookieStore) {
    throw new Error(
      'CoreAuthMiddleware: cookieStore is required for jwt strategy'
    )
  }

  const {
    strategy,
    sessionAdapter,
    cookieStore,
    userAdapter,
    cookieName = DEFAULT_SESSION_COOKIE_NAME,
    onSession,
    pages,
  } = config

  return async (request, next) => {
    // 1. Extract session token from cookie
    const token = getSessionFromCookie(request, { name: cookieName })

    let session: Session | null = null
    let user: User | null = null

    if (token) {
      // 2. Validate session based on strategy
      if (strategy === 'jwt') {
        session = await cookieStore!.decode(token)
      } else {
        session = await sessionAdapter!.getSession(token)
      }

      // Check session validity
      if (session) {
        // Check if session has expired
        if (new Date(session.expiresAt) < new Date()) {
          session = null
        }
      }

      // 3. Fetch user if session is valid
      if (session) {
        if (userAdapter) {
          user = await userAdapter.getUser(session.userId)
        } else {
          // Create minimal user object from session
          user = createMinimalUser(session.userId)
        }
      }

      // 4. Run onSession callback for enrichment
      if (session && user && onSession) {
        try {
          const enriched = await onSession({ session, user, request })
          if (enriched?.session) session = enriched.session
          if (enriched?.user) user = enriched.user
        } catch (error) {
          // Log but don't fail - session remains valid
          console.error('onSession callback error:', error)
        }
      }
    }

    // 5. Set context for downstream handlers
    setAuthContext(user, session)

    // Set auth config for context helpers (e.g., requireAuth redirect URL)
    if (pages) {
      // Use Partial<AuthConfig> since we only need pages for redirects
      setAuthConfig({ providers: [], pages } as AuthConfig)
    }

    // 6. Continue to next middleware
    const response = await next()

    // 7. Return response (session refresh handled by session manager if needed)
    return response
  }
}

/**
 * Create a minimal user object from a user ID.
 *
 * Used when no userAdapter is provided - creates a basic user object
 * that satisfies the User type with placeholder values.
 *
 * @param userId - The user's ID from the session
 * @returns A minimal User object
 */
function createMinimalUser(userId: string): User {
  const now = new Date()
  return {
    id: userId,
    email: '', // Unknown without userAdapter
    emailVerified: null,
    createdAt: now,
    updatedAt: now,
  }
}
