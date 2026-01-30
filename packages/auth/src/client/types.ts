/**
 * @cloudwerk/auth - Client Types
 *
 * Type definitions for client-side auth hooks and utilities.
 */

// ============================================================================
// Session Types
// ============================================================================

/**
 * Client-side session data.
 */
export interface ClientSession {
  /** User data */
  user: ClientUser | null

  /** Session expiration timestamp */
  expires: string | null

  /** Whether session is valid */
  isValid: boolean
}

/**
 * Client-side user data.
 */
export interface ClientUser {
  /** User ID */
  id: string

  /** User email */
  email?: string | null

  /** User name */
  name?: string | null

  /** User avatar URL */
  image?: string | null

  /** Whether email is verified */
  emailVerified?: boolean | null

  /** User roles */
  roles?: string[]

  /** Additional user data */
  data?: Record<string, unknown>
}

// ============================================================================
// Auth State Types
// ============================================================================

/**
 * Authentication state.
 */
export interface AuthState {
  /** Current session */
  session: ClientSession | null

  /** Whether session is loading */
  loading: boolean

  /** Error message if any */
  error: string | null

  /** Whether user is authenticated */
  isAuthenticated: boolean
}

/**
 * Auth context value.
 */
export interface AuthContextValue extends AuthState {
  /** Sign in with a provider */
  signIn: (provider: string, options?: SignInOptions) => Promise<void>

  /** Sign out */
  signOut: (options?: SignOutOptions) => Promise<void>

  /** Refresh session */
  refresh: () => Promise<void>
}

// ============================================================================
// Action Options
// ============================================================================

/**
 * Sign-in options.
 */
export interface SignInOptions {
  /** Redirect URL after sign-in */
  callbackUrl?: string

  /** Credentials for credentials provider */
  credentials?: Record<string, string>

  /** Whether to redirect (vs. return result) */
  redirect?: boolean
}

/**
 * Sign-out options.
 */
export interface SignOutOptions {
  /** Redirect URL after sign-out */
  callbackUrl?: string

  /** Whether to redirect (vs. return result) */
  redirect?: boolean
}

/**
 * Sign-in result.
 */
export interface SignInResult {
  /** Whether sign-in succeeded */
  ok: boolean

  /** Error message if failed */
  error?: string

  /** Redirect URL */
  url?: string
}

/**
 * Sign-out result.
 */
export interface SignOutResult {
  /** Whether sign-out succeeded */
  ok: boolean

  /** Redirect URL */
  url?: string
}

// ============================================================================
// Provider Types
// ============================================================================

/**
 * Provider info for client.
 */
export interface ClientProvider {
  /** Provider ID */
  id: string

  /** Provider name */
  name: string

  /** Provider type */
  type: 'oauth' | 'oidc' | 'credentials' | 'email' | 'passkey'

  /** Sign-in URL */
  signinUrl: string

  /** Callback URL */
  callbackUrl: string
}

// ============================================================================
// Hook Options
// ============================================================================

/**
 * Session hook options.
 */
export interface UseSessionOptions {
  /** Whether to require authentication (redirects if not authenticated) */
  required?: boolean

  /** Redirect URL when not authenticated */
  redirectTo?: string

  /** Refetch interval in milliseconds */
  refetchInterval?: number

  /** Callback when session changes */
  onSessionChange?: (session: ClientSession | null) => void
}

/**
 * Auth hook options.
 */
export interface UseAuthOptions extends UseSessionOptions {
  /** Base path for auth endpoints */
  basePath?: string
}

// ============================================================================
// Internal Types
// ============================================================================

/**
 * Session response from server.
 */
export interface SessionResponse {
  user: ClientUser | null
  expires: string | null
}

/**
 * CSRF token response.
 */
export interface CSRFResponse {
  csrfToken: string
}

/**
 * Providers response.
 */
export interface ProvidersResponse {
  [providerId: string]: ClientProvider
}
