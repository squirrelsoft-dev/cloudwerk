/**
 * @cloudwerk/auth - Route Types
 *
 * Type definitions for auth route handlers.
 */

import type { Provider, TokenSet, User, Session, AuthConfig } from '../types.js'
import type { SessionManager } from '../session/session-manager.js'

/**
 * Context passed to auth route handlers.
 */
export interface AuthRouteContext<Env = Record<string, unknown>> {
  /** The original request */
  request: Request

  /** Environment bindings */
  env: Env

  /** Auth configuration */
  config: AuthConfig

  /** Session manager */
  sessionManager: SessionManager

  /** Available providers */
  providers: Map<string, Provider>

  /** Current user (if authenticated) */
  user: User | null

  /** Current session (if authenticated) */
  session: Session | null

  /** Request URL */
  url: URL

  /** Response headers to set */
  responseHeaders: Headers
}

/**
 * Result of an auth route handler.
 */
export interface AuthRouteResult {
  /** Response to send */
  response?: Response

  /** Redirect URL */
  redirect?: string

  /** User to set in session */
  user?: User

  /** Session token to set */
  sessionToken?: string

  /** Cookies to set */
  cookies?: Array<{
    name: string
    value: string
    options?: {
      maxAge?: number
      path?: string
      httpOnly?: boolean
      secure?: boolean
      sameSite?: 'strict' | 'lax' | 'none'
    }
  }>

  /** Cookies to delete */
  deleteCookies?: string[]
}

/**
 * OAuth callback parameters.
 */
export interface OAuthCallbackParams {
  /** Authorization code */
  code?: string

  /** State parameter */
  state?: string

  /** Error from provider */
  error?: string

  /** Error description */
  error_description?: string
}

/**
 * Credentials callback parameters.
 */
export interface CredentialsCallbackParams {
  /** Submitted credentials */
  credentials: Record<string, string>

  /** CSRF token */
  csrfToken?: string

  /** Redirect URL after sign-in */
  callbackUrl?: string
}

/**
 * Sign-in page props passed to custom sign-in pages.
 */
export interface SignInProps {
  /** Available providers */
  providers: Array<{
    id: string
    name: string
    type: Provider['type']
    callbackUrl: string
  }>

  /** CSRF token for forms */
  csrfToken: string

  /** Callback URL after sign-in */
  callbackUrl: string

  /** Error message if sign-in failed */
  error?: string

  /** Error type */
  errorType?: string
}

/**
 * Session response data.
 */
export interface SessionResponse {
  /** Current user */
  user: {
    id: string
    email: string
    name?: string | null
    image?: string | null
  } | null

  /** Session expiration */
  expires: string | null
}

/**
 * CSRF response data.
 */
export interface CSRFResponse {
  /** CSRF token */
  csrfToken: string
}

/**
 * Providers response data.
 */
export interface ProvidersResponse {
  /** Available providers */
  providers: Array<{
    id: string
    name: string
    type: Provider['type']
  }>
}

/**
 * Auth handler function type.
 */
export type AuthHandler<Env = Record<string, unknown>> = (
  ctx: AuthRouteContext<Env>
) => Promise<Response>

/**
 * OAuth state stored during authorization.
 */
export interface StoredOAuthState {
  /** State value */
  state: string

  /** Callback URL to redirect to after auth */
  callbackUrl: string

  /** PKCE code verifier */
  codeVerifier?: string

  /** OIDC nonce */
  nonce?: string

  /** Provider ID */
  providerId: string

  /** When created */
  createdAt: number
}

/**
 * Sign-in result from provider callback.
 */
export interface SignInResult {
  /** Whether sign-in was successful */
  success: boolean

  /** The user if successful */
  user?: User

  /** Token set from OAuth provider */
  tokens?: TokenSet

  /** Error code if failed */
  error?: string

  /** Error message if failed */
  message?: string

  /** Whether this is a new user */
  isNewUser?: boolean
}
