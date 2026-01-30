/**
 * Session management module for @cloudwerk/auth.
 *
 * Provides multiple session storage backends:
 * - KV Sessions (default) - Server-side sessions with user index
 * - Cookie Sessions - Stateless JWT-based sessions
 *
 * @example
 * ```typescript
 * // KV-based sessions (recommended for most use cases)
 * import {
 *   createKVSessionAdapter,
 *   createSessionManager,
 * } from '@cloudwerk/auth/session'
 *
 * const adapter = createKVSessionAdapter({
 *   binding: env.AUTH_SESSIONS,
 *   enableUserIndex: true, // Enable "sign out all devices"
 * })
 *
 * const manager = createSessionManager({ adapter })
 * const session = await manager.createSession('user_123')
 * ```
 *
 * @example
 * ```typescript
 * // Cookie-based sessions (stateless JWT)
 * import {
 *   createCookieSessionStore,
 *   setSessionCookie,
 *   getSessionFromCookie,
 * } from '@cloudwerk/auth/session'
 *
 * const store = createCookieSessionStore({
 *   secret: env.SESSION_SECRET,
 * })
 *
 * // Encode session to cookie
 * const token = await store.encode(session)
 * const response = setSessionCookie(new Response('OK'), token)
 *
 * // Decode session from cookie
 * const tokenFromRequest = getSessionFromCookie(request)
 * const session = await store.decode(tokenFromRequest!)
 * ```
 */

// Constants
export {
  DEFAULT_SESSION_COOKIE_NAME,
  DEFAULT_COOKIE_ATTRIBUTES,
  DEFAULT_SESSION_MAX_AGE,
  DEFAULT_SESSION_UPDATE_AGE,
  SESSION_EXPIRY_GRACE_PERIOD,
  DEFAULT_SESSION_PREFIX,
  USER_SESSIONS_PREFIX,
  DEFAULT_JWT_ALGORITHM,
  JWT_CLAIMS,
} from './constants.js'

// Cookie utilities
export {
  parseCookies,
  serializeCookie,
  getSessionFromCookie,
  setSessionCookie,
  clearSessionCookie,
} from './cookie-utils.js'

// KV adapter
export {
  createKVSessionAdapter,
  type KVSessionAdapter,
} from './kv-adapter.js'

// Cookie session store
export { createCookieSessionStore } from './cookie-store.js'

// Session manager
export {
  createSessionManager,
  type SessionManager,
  type SessionManagerConfig,
} from './session-manager.js'
