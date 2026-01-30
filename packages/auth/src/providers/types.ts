/**
 * @cloudwerk/auth - Credentials Provider Types
 *
 * Type definitions for the credentials authentication provider.
 */

import type {
  Awaitable,
  CredentialInput,
  CredentialsProvider,
  User,
  Account,
} from '../types.js'
import type { SessionManager } from '../session/session-manager.js'

// ============================================================================
// Credentials Config Types
// ============================================================================

/**
 * Context passed to the authorize callback.
 *
 * Provides access to the raw request and environment bindings
 * for database access and other operations.
 *
 * @typeParam Env - Environment bindings type (e.g., { DB: D1Database })
 */
export interface CredentialsAuthorizeContext<Env = Record<string, unknown>> {
  /** The original sign-in request */
  request: Request

  /** Environment bindings from Cloudflare Workers */
  env: Env
}

/**
 * Result of a successful authorization.
 *
 * Omits `createdAt` and `updatedAt` as these are managed by the system.
 */
export type AuthorizeResult = Omit<User, 'createdAt' | 'updatedAt'> | null

/**
 * Configuration for the credentials provider factory.
 *
 * @typeParam TCredentials - Shape of credential fields
 * @typeParam Env - Environment bindings type
 *
 * @example
 * ```typescript
 * const config: CredentialsConfig = {
 *   authorize: async (creds, ctx) => {
 *     const user = await ctx.env.DB
 *       .prepare('SELECT * FROM users WHERE email = ?')
 *       .bind(creds.email)
 *       .first()
 *
 *     if (!user || !await verifyPassword(creds.password, user.password_hash)) {
 *       return null
 *     }
 *
 *     return { id: user.id, email: user.email, name: user.name, emailVerified: null }
 *   }
 * }
 * ```
 */
export interface CredentialsConfig<
  TCredentials extends Record<string, CredentialInput> = Record<string, CredentialInput>,
  Env = Record<string, unknown>,
> {
  /**
   * Unique identifier for this provider.
   * @default 'credentials'
   */
  id?: string

  /**
   * Display name for this provider.
   * @default 'Credentials'
   */
  name?: string

  /**
   * Credential field definitions.
   *
   * Defines the shape of credentials expected by the authorize callback.
   * Used for form generation and type inference.
   *
   * @default { email: { label: 'Email', type: 'email' }, password: { label: 'Password', type: 'password' } }
   */
  credentials?: TCredentials

  /**
   * Authorize callback that validates credentials and returns user data.
   *
   * @param credentials - The submitted credentials (typed to match credential fields)
   * @param context - Context with request and env bindings
   * @returns User data if valid, null if invalid
   */
  authorize: (
    credentials: { [K in keyof TCredentials]: string },
    context: CredentialsAuthorizeContext<Env>
  ) => Awaitable<AuthorizeResult>
}

// ============================================================================
// Sign-In Handler Types
// ============================================================================

/**
 * Options for the handleCredentialsSignIn function.
 */
export interface HandleCredentialsSignInOptions {
  /**
   * URL to redirect to on successful sign-in.
   * If not provided, returns a JSON response instead.
   */
  redirectTo?: string

  /**
   * URL to redirect to on sign-in error.
   * If not provided, returns a JSON error response instead.
   * Error details are passed as `?error=CredentialsSignin` query param.
   */
  errorRedirectTo?: string
}

/**
 * Configuration for the handleCredentialsSignIn handler.
 *
 * @typeParam TCredentials - Shape of credential fields
 */
export interface CredentialsSignInHandlerConfig<
  TCredentials extends Record<string, CredentialInput> = Record<string, CredentialInput>,
> {
  /** The credentials provider instance */
  provider: CredentialsProvider

  /** Session manager for creating sessions */
  sessionManager: SessionManager

  /**
   * Original credential schema for type inference.
   * Used internally to validate submitted fields.
   */
  credentials?: TCredentials

  /**
   * Maximum session age in seconds.
   * If not provided, uses session manager defaults.
   */
  maxAge?: number
}

/**
 * Result of a successful credentials sign-in.
 */
export interface CredentialsSignInResult {
  /** The authenticated user */
  user: User

  /** The account record (type: 'credentials') */
  account: Account

  /** The session token for cookie storage */
  sessionToken: string
}
