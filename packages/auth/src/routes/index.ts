/**
 * @cloudwerk/auth - Routes Module
 *
 * Auto-generated authentication route handlers.
 *
 * @example
 * ```typescript
 * import { createAuthRoutes } from '@cloudwerk/auth/routes'
 *
 * const authRoutes = createAuthRoutes({
 *   config: authConfig,
 *   sessionManager,
 *   providers: providerMap,
 *   stateStorage: {
 *     set: (key, value, ttl) => env.AUTH_KV.put(key, value, { expirationTtl: ttl }),
 *     get: (key) => env.AUTH_KV.get(key),
 *     delete: (key) => env.AUTH_KV.delete(key),
 *   },
 * })
 *
 * // Register with Hono
 * app.route('/auth', authRoutes)
 * ```
 */

// Types
export type {
  AuthRouteContext,
  AuthRouteResult,
  OAuthCallbackParams,
  CredentialsCallbackParams,
  SignInProps,
  SessionResponse,
  CSRFResponse,
  ProvidersResponse,
  AuthHandler,
  StoredOAuthState,
  SignInResult,
} from './types.js'

// Session handler
export { handleSession } from './handlers/session.js'

// CSRF handler
export {
  handleCSRF,
  verifyCSRFToken,
  extractCSRFToken,
} from './handlers/csrf.js'

// Providers handler
export { handleProviders } from './handlers/providers.js'

// Sign-in handlers
export {
  handleSignIn,
  handleSignInProvider,
  handleSignInPost,
} from './handlers/signin.js'

export type { StateStorage } from './handlers/signin.js'

// Callback handlers
export {
  handleOAuthCallback,
  handleCredentialsCallback,
} from './handlers/callback.js'

// Sign-out handlers
export {
  handleSignOutGet,
  handleSignOutPost,
} from './handlers/signout.js'
