/**
 * @cloudwerk/auth - Type Definitions
 *
 * Core types for authentication and session management.
 */

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Type that can be either a value or a Promise of that value.
 * Used throughout the auth package for async-friendly APIs.
 *
 * @example
 * ```typescript
 * // Function that can return sync or async
 * function getUser(id: string): Awaitable<User> {
 *   return cache.get(id) ?? db.users.findUnique({ where: { id } })
 * }
 * ```
 */
export type Awaitable<T> = T | Promise<T>

// ============================================================================
// Core Entity Types
// ============================================================================

/**
 * Represents an authenticated user.
 *
 * The base fields are required for the auth system to function.
 * Extend with custom data using the `TUserData` generic parameter.
 *
 * @typeParam TUserData - Custom user data fields
 *
 * @example
 * ```typescript
 * // Basic user
 * type MyUser = User<{ role: 'admin' | 'user' }>
 *
 * // User with extended profile
 * interface ProfileData {
 *   bio?: string
 *   avatarUrl?: string
 *   preferences: UserPreferences
 * }
 * type MyUser = User<ProfileData>
 * ```
 */
export interface User<TUserData = Record<string, unknown>> {
  /** Unique identifier for the user */
  id: string

  /** User's email address (unique) */
  email: string

  /** Whether the email has been verified */
  emailVerified: Date | null

  /** Display name */
  name?: string | null

  /** Avatar/profile image URL */
  image?: string | null

  /** When the user was created */
  createdAt: Date

  /** When the user was last updated */
  updatedAt: Date

  /** Custom user data */
  data?: TUserData
}

/**
 * Represents an active user session.
 *
 * Sessions track authenticated state and can store custom session data.
 *
 * @typeParam TSessionData - Custom session data fields
 *
 * @example
 * ```typescript
 * // Session with cart data
 * interface CartSessionData {
 *   cartId: string
 *   itemCount: number
 * }
 * type MySession = Session<CartSessionData>
 * ```
 */
export interface Session<TSessionData = Record<string, unknown>> {
  /** Unique session identifier */
  id: string

  /** ID of the user this session belongs to */
  userId: string

  /** When the session expires */
  expiresAt: Date

  /** When the session was created */
  createdAt: Date

  /** When the session was last accessed/updated */
  updatedAt: Date

  /** Session token (hashed in storage) */
  sessionToken: string

  /** Custom session data */
  data?: TSessionData
}

/**
 * Represents a linked OAuth account for a user.
 *
 * Users can have multiple accounts from different providers.
 */
export interface Account {
  /** Unique identifier for the account link */
  id: string

  /** ID of the user this account belongs to */
  userId: string

  /** OAuth provider type (e.g., 'oauth', 'oidc', 'credentials') */
  type: ProviderType

  /** Provider identifier (e.g., 'google', 'github') */
  provider: string

  /** User's ID at the provider */
  providerAccountId: string

  /** OAuth refresh token (encrypted in storage) */
  refreshToken?: string | null

  /** OAuth access token (encrypted in storage) */
  accessToken?: string | null

  /** When the access token expires */
  expiresAt?: number | null

  /** Token type (usually 'Bearer') */
  tokenType?: string | null

  /** OAuth scopes granted */
  scope?: string | null

  /** OIDC ID token */
  idToken?: string | null
}

/**
 * Token for email verification or password reset flows.
 */
export interface VerificationToken {
  /** The token identifier (email + token hash) */
  identifier: string

  /** The verification token (hashed in storage) */
  token: string

  /** When this token expires */
  expiresAt: Date
}

/**
 * OAuth token set returned from provider authorization.
 */
export interface TokenSet {
  /** OAuth access token */
  accessToken: string

  /** Token type (usually 'Bearer') */
  tokenType: string

  /** Access token expiration in seconds */
  expiresIn?: number

  /** OAuth refresh token */
  refreshToken?: string

  /** OAuth scopes granted */
  scope?: string

  /** OIDC ID token (JWT) */
  idToken?: string
}

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Main authentication configuration.
 *
 * Configures providers, session handling, callbacks, and integration
 * with Cloudflare services.
 *
 * @typeParam TUser - Custom user type
 * @typeParam TSession - Custom session type
 *
 * @example
 * ```typescript
 * import type { AuthConfig } from '@cloudwerk/auth'
 *
 * export const authConfig: AuthConfig = {
 *   providers: [
 *     GoogleProvider({
 *       clientId: env.GOOGLE_CLIENT_ID,
 *       clientSecret: env.GOOGLE_CLIENT_SECRET,
 *     }),
 *   ],
 *   session: {
 *     strategy: 'database',
 *     maxAge: 30 * 24 * 60 * 60, // 30 days
 *   },
 *   pages: {
 *     signIn: '/auth/login',
 *   },
 * }
 * ```
 */
export interface AuthConfig<
  TUser = User,
  TSession = Session,
> {
  /** Authentication providers to enable */
  providers: Provider[]

  /** Session configuration */
  session?: SessionConfig

  /** Cookie configuration */
  cookies?: CookieConfig

  /** CSRF protection configuration */
  csrf?: CSRFConfig

  /** Custom authentication pages */
  pages?: AuthPages

  /** Lifecycle callbacks */
  callbacks?: AuthCallbacks<TUser, TSession>

  /** Event handlers */
  events?: AuthEvents

  /** Session storage adapter */
  sessionAdapter?: SessionAdapter

  /** User storage adapter */
  userAdapter?: UserAdapter

  /** Enable debug logging */
  debug?: boolean

  /** Base path for auth routes (default: '/auth') */
  basePath?: string

  /** Secret for signing tokens/cookies (required in production) */
  secret?: string

  /** Trust the X-Forwarded-* headers from proxy */
  trustHost?: boolean
}

/**
 * Session storage and behavior configuration.
 */
export interface SessionConfig {
  /**
   * Session strategy.
   * - `'jwt'`: Stateless JWT tokens stored in cookies
   * - `'database'`: Server-side sessions with cookie token
   * @default 'jwt'
   */
  strategy?: 'jwt' | 'database'

  /**
   * Maximum session age in seconds.
   * @default 2592000 (30 days)
   */
  maxAge?: number

  /**
   * How often to refresh session in seconds.
   * Session `updatedAt` is updated on access after this interval.
   * @default 86400 (24 hours)
   */
  updateAge?: number

  /**
   * Generate new session ID on sign-in (prevents session fixation).
   * @default true
   */
  generateSessionToken?: () => string
}

/**
 * Cookie configuration options.
 */
export interface CookieConfig {
  /** Session token cookie options */
  sessionToken?: CookieOption

  /** CSRF token cookie options */
  csrfToken?: CookieOption

  /** Callback URL cookie options */
  callbackUrl?: CookieOption

  /** State cookie options (for OAuth) */
  state?: CookieOption

  /** Nonce cookie options (for OIDC) */
  nonce?: CookieOption

  /** PKCE code verifier cookie options */
  pkceCodeVerifier?: CookieOption
}

/**
 * Configuration for a specific cookie.
 */
export interface CookieOption {
  /** Cookie name */
  name: string

  /** Cookie attributes */
  options: CookieAttributes
}

/**
 * Standard cookie attributes.
 */
export interface CookieAttributes {
  /** Cookie domain */
  domain?: string

  /** Cookie path */
  path?: string

  /** Secure flag (HTTPS only) */
  secure?: boolean

  /** HttpOnly flag */
  httpOnly?: boolean

  /** SameSite attribute */
  sameSite?: 'strict' | 'lax' | 'none'

  /** Max age in seconds */
  maxAge?: number

  /** Expiration date */
  expires?: Date
}

/**
 * CSRF protection configuration.
 */
export interface CSRFConfig {
  /**
   * Enable CSRF protection.
   * @default true
   */
  enabled?: boolean

  /**
   * Cookie name for CSRF token.
   * @default 'cloudwerk.csrf-token'
   */
  cookieName?: string

  /**
   * Methods that require CSRF validation.
   * @default ['POST', 'PUT', 'PATCH', 'DELETE']
   */
  methods?: string[]
}

// ============================================================================
// Storage Adapter Types
// ============================================================================

/**
 * Adapter for session storage.
 *
 * Implement this interface to store sessions in KV, D1, or custom storage.
 *
 * @example
 * ```typescript
 * import type { SessionAdapter } from '@cloudwerk/auth'
 *
 * export function createKVSessionAdapter(kv: KVNamespace): SessionAdapter {
 *   return {
 *     async createSession(session) {
 *       await kv.put(`session:${session.id}`, JSON.stringify(session), {
 *         expirationTtl: 30 * 24 * 60 * 60,
 *       })
 *       return session
 *     },
 *     async getSession(sessionToken) {
 *       const data = await kv.get(`session:${sessionToken}`)
 *       return data ? JSON.parse(data) : null
 *     },
 *     // ...
 *   }
 * }
 * ```
 */
export interface SessionAdapter {
  /** Create a new session */
  createSession(session: Omit<Session, 'id'>): Awaitable<Session>

  /** Get session by token */
  getSession(sessionToken: string): Awaitable<Session | null>

  /** Get session with associated user */
  getSessionAndUser(
    sessionToken: string
  ): Awaitable<{ session: Session; user: User } | null>

  /** Update session data or expiration */
  updateSession(
    sessionToken: string,
    data: Partial<Session>
  ): Awaitable<Session | null>

  /** Delete a session */
  deleteSession(sessionToken: string): Awaitable<void>
}

/**
 * Adapter for user storage.
 *
 * Implement this interface to store users in D1, Durable Objects, or custom storage.
 *
 * @example
 * ```typescript
 * import type { UserAdapter } from '@cloudwerk/auth'
 *
 * export function createD1UserAdapter(db: D1Database): UserAdapter {
 *   return {
 *     async createUser(user) {
 *       const id = crypto.randomUUID()
 *       await db.prepare(
 *         'INSERT INTO users (id, email, name) VALUES (?, ?, ?)'
 *       ).bind(id, user.email, user.name).run()
 *       return { ...user, id }
 *     },
 *     // ...
 *   }
 * }
 * ```
 */
export interface UserAdapter {
  /** Create a new user */
  createUser(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Awaitable<User>

  /** Get user by ID */
  getUser(id: string): Awaitable<User | null>

  /** Get user by email */
  getUserByEmail(email: string): Awaitable<User | null>

  /** Get user by OAuth account */
  getUserByAccount(
    provider: string,
    providerAccountId: string
  ): Awaitable<User | null>

  /** Update user data */
  updateUser(id: string, data: Partial<User>): Awaitable<User>

  /** Delete a user */
  deleteUser(id: string): Awaitable<void>

  /** Link an OAuth account to a user */
  linkAccount(account: Omit<Account, 'id'>): Awaitable<Account>

  /** Unlink an OAuth account */
  unlinkAccount(provider: string, providerAccountId: string): Awaitable<void>

  /** Create a verification token */
  createVerificationToken(token: VerificationToken): Awaitable<VerificationToken>

  /** Use (consume) a verification token */
  useVerificationToken(
    identifier: string,
    token: string
  ): Awaitable<VerificationToken | null>
}

/**
 * Base configuration for storage adapters.
 */
export interface AdapterConfig {
  /** Enable debug logging for adapter operations */
  debug?: boolean
}

/**
 * Configuration for KV-based session adapter.
 *
 * @typeParam TKV - KV namespace type (defaults to Cloudflare's KVNamespace)
 *
 * @example
 * ```typescript
 * import { createKVSessionAdapter } from '@cloudwerk/auth/adapters/kv'
 *
 * const sessionAdapter = createKVSessionAdapter({
 *   binding: env.AUTH_SESSIONS,
 *   prefix: 'session:',
 * })
 * ```
 */
export interface KVSessionAdapterConfig<TKV = unknown> extends AdapterConfig {
  /** KV namespace binding (KVNamespace from @cloudflare/workers-types) */
  binding: TKV

  /** Key prefix for session entries */
  prefix?: string
}

/**
 * Configuration for D1-based user adapter.
 *
 * @typeParam TD1 - D1 database type (defaults to Cloudflare's D1Database)
 *
 * @example
 * ```typescript
 * import { createD1UserAdapter } from '@cloudwerk/auth/adapters/d1'
 *
 * const userAdapter = createD1UserAdapter({
 *   binding: env.DB,
 *   tables: {
 *     users: 'auth_users',
 *     accounts: 'auth_accounts',
 *   },
 * })
 * ```
 */
export interface D1UserAdapterConfig<TD1 = unknown> extends AdapterConfig {
  /** D1 database binding (D1Database from @cloudflare/workers-types) */
  binding: TD1

  /** Custom table names */
  tables?: {
    users?: string
    accounts?: string
    verificationTokens?: string
  }
}

// ============================================================================
// Provider Types
// ============================================================================

/**
 * Type of authentication provider.
 */
export type ProviderType = 'oauth' | 'oidc' | 'credentials' | 'email'

/**
 * Base provider interface.
 *
 * All authentication providers implement this interface.
 *
 * @typeParam TProfile - Profile type returned by the provider
 */
export interface Provider<TProfile = Record<string, unknown>> {
  /** Unique provider identifier (e.g., 'google', 'github') */
  id: string

  /** Display name for the provider */
  name: string

  /** Provider type */
  type: ProviderType

  /**
   * Transform provider profile to user data.
   * Called after successful authentication.
   */
  profile?: (profile: TProfile, tokens: TokenSet) => Awaitable<Partial<User>>
}

/**
 * OAuth 2.0 / OpenID Connect provider.
 *
 * @typeParam TProfile - Profile type returned by the provider's userinfo endpoint
 *
 * @example
 * ```typescript
 * import type { OAuthProvider } from '@cloudwerk/auth'
 *
 * interface GoogleProfile {
 *   sub: string
 *   email: string
 *   email_verified: boolean
 *   name: string
 *   picture: string
 * }
 *
 * export function GoogleProvider(options: {
 *   clientId: string
 *   clientSecret: string
 * }): OAuthProvider<GoogleProfile> {
 *   return {
 *     id: 'google',
 *     name: 'Google',
 *     type: 'oidc',
 *     clientId: options.clientId,
 *     clientSecret: options.clientSecret,
 *     wellKnown: 'https://accounts.google.com/.well-known/openid-configuration',
 *     profile(profile) {
 *       return {
 *         id: profile.sub,
 *         email: profile.email,
 *         emailVerified: profile.email_verified ? new Date() : null,
 *         name: profile.name,
 *         image: profile.picture,
 *       }
 *     },
 *   }
 * }
 * ```
 */
export interface OAuthProvider<TProfile = Record<string, unknown>>
  extends Provider<TProfile> {
  type: 'oauth' | 'oidc'

  /** OAuth client ID */
  clientId: string

  /** OAuth client secret */
  clientSecret: string

  /** Authorization endpoint URL */
  authorization?: string | { url: string; params?: Record<string, string> }

  /** Token endpoint URL */
  token?: string | { url: string; params?: Record<string, string> }

  /** Userinfo endpoint URL */
  userinfo?: string | { url: string }

  /** OIDC well-known configuration URL */
  wellKnown?: string

  /** OAuth scopes to request */
  scope?: string

  /** Additional authorization parameters */
  authorizationParams?: Record<string, string>

  /** Use PKCE for authorization */
  checks?: ('pkce' | 'state' | 'nonce')[]

  /** Custom headers for token request */
  headers?: Record<string, string>

  /** Client authentication method */
  clientAuth?: 'client_secret_basic' | 'client_secret_post'
}

/**
 * Credentials provider for username/password authentication.
 *
 * @example
 * ```typescript
 * import type { CredentialsProvider } from '@cloudwerk/auth'
 *
 * export function EmailPasswordProvider(): CredentialsProvider {
 *   return {
 *     id: 'credentials',
 *     name: 'Email & Password',
 *     type: 'credentials',
 *     credentials: {
 *       email: { label: 'Email', type: 'email', placeholder: 'user@example.com' },
 *       password: { label: 'Password', type: 'password' },
 *     },
 *     async authorize(credentials, request) {
 *       const user = await db.users.findUnique({
 *         where: { email: credentials.email },
 *       })
 *       if (!user) return null
 *
 *       const valid = await verifyPassword(credentials.password, user.passwordHash)
 *       if (!valid) return null
 *
 *       return { id: user.id, email: user.email, name: user.name }
 *     },
 *   }
 * }
 * ```
 */
export interface CredentialsProvider extends Provider {
  type: 'credentials'

  /** Credential field definitions for sign-in form */
  credentials: Record<string, CredentialInput>

  /**
   * Authorize the user with provided credentials.
   * Return user object on success, null on failure.
   */
  authorize: (
    credentials: Record<string, string>,
    request: Request
  ) => Awaitable<Omit<User, 'createdAt' | 'updatedAt'> | null>
}

/**
 * Definition for a credential input field.
 */
export interface CredentialInput {
  /** Label for the input field */
  label?: string

  /** Input type (text, email, password, etc.) */
  type?: string

  /** Placeholder text */
  placeholder?: string

  /** Whether the field is required */
  required?: boolean
}

/**
 * Email/magic link provider for passwordless authentication.
 *
 * @example
 * ```typescript
 * import type { EmailProvider } from '@cloudwerk/auth'
 *
 * export function MagicLinkProvider(options: {
 *   from: string
 *   sendMail: (to: string, url: string) => Promise<void>
 * }): EmailProvider {
 *   return {
 *     id: 'email',
 *     name: 'Email',
 *     type: 'email',
 *     from: options.from,
 *     sendVerificationRequest: async ({ identifier, url }) => {
 *       await options.sendMail(identifier, url)
 *     },
 *   }
 * }
 * ```
 */
export interface EmailProvider extends Provider {
  type: 'email'

  /** Sender email address */
  from: string

  /** Maximum age of verification token in seconds */
  maxAge?: number

  /**
   * Send the verification email.
   * Called when user requests a magic link.
   */
  sendVerificationRequest: (params: {
    identifier: string
    url: string
    provider: EmailProvider
    token: string
    expires: Date
  }) => Awaitable<void>

  /** Generate verification token (default: random string) */
  generateVerificationToken?: () => Awaitable<string>
}

// ============================================================================
// Callback & Event Types
// ============================================================================

/**
 * Authentication lifecycle callbacks.
 *
 * Callbacks allow customizing authentication behavior at key points.
 *
 * @typeParam TUser - User type
 * @typeParam TSession - Session type
 *
 * @example
 * ```typescript
 * const callbacks: AuthCallbacks = {
 *   async signIn({ user, account, profile }) {
 *     // Block sign-in for unverified emails
 *     if (!user.emailVerified) {
 *       return false
 *     }
 *     return true
 *   },
 *   async session({ session, user }) {
 *     // Add user role to session
 *     session.data = { role: user.data?.role }
 *     return session
 *   },
 * }
 * ```
 */
export interface AuthCallbacks<TUser = User, TSession = Session> {
  /** Called when a user signs in */
  signIn?: SignInCallback<TUser>

  /** Called when session is accessed */
  session?: SessionCallback<TUser, TSession>

  /** Called when JWT is created/updated (JWT strategy only) */
  jwt?: JWTCallback

  /** Called before redirect */
  redirect?: RedirectCallback
}

/**
 * Callback invoked during sign-in.
 *
 * Return `true` to allow sign-in, `false` to deny, or a URL string to redirect.
 */
export type SignInCallback<TUser = User> = (params: {
  user: TUser
  account: Account | null
  profile?: Record<string, unknown>
  email?: { verificationRequest?: boolean }
  credentials?: Record<string, string>
}) => Awaitable<boolean | string>

/**
 * Callback invoked when session is accessed.
 *
 * Use to add custom data to the session object.
 */
export type SessionCallback<TUser = User, TSession = Session> = (params: {
  session: TSession
  user: TUser
  token?: Record<string, unknown>
}) => Awaitable<TSession>

/**
 * Callback invoked when JWT is created or updated.
 *
 * Use to add custom claims to the JWT.
 */
export type JWTCallback = (params: {
  token: Record<string, unknown>
  user?: User
  account?: Account | null
  profile?: Record<string, unknown>
  trigger?: 'signIn' | 'signUp' | 'update'
  isNewUser?: boolean
}) => Awaitable<Record<string, unknown>>

/**
 * Callback invoked before redirects.
 *
 * Use to customize redirect behavior.
 */
export type RedirectCallback = (params: {
  url: string
  baseUrl: string
}) => Awaitable<string>

/**
 * Authentication event handlers.
 *
 * Events are fire-and-forget notifications for logging/analytics.
 */
export interface AuthEvents {
  /** Fired when a user signs in */
  signIn?: (event: AuthEvent<'signIn'>) => Awaitable<void>

  /** Fired when a user signs out */
  signOut?: (event: AuthEvent<'signOut'>) => Awaitable<void>

  /** Fired when a new user is created */
  createUser?: (event: AuthEvent<'createUser'>) => Awaitable<void>

  /** Fired when a user is updated */
  updateUser?: (event: AuthEvent<'updateUser'>) => Awaitable<void>

  /** Fired when an account is linked */
  linkAccount?: (event: AuthEvent<'linkAccount'>) => Awaitable<void>

  /** Fired when a session is created */
  session?: (event: AuthEvent<'session'>) => Awaitable<void>
}

/**
 * Type of authentication event.
 */
export type AuthEventType =
  | 'signIn'
  | 'signOut'
  | 'createUser'
  | 'updateUser'
  | 'linkAccount'
  | 'session'

/**
 * Authentication event payload.
 */
export type AuthEvent<T extends AuthEventType> = T extends 'signIn'
  ? { user: User; account?: Account; isNewUser?: boolean }
  : T extends 'signOut'
    ? { session: Session; token?: Record<string, unknown> }
    : T extends 'createUser'
      ? { user: User }
      : T extends 'updateUser'
        ? { user: User }
        : T extends 'linkAccount'
          ? { user: User; account: Account }
          : T extends 'session'
            ? { session: Session; token?: Record<string, unknown> }
            : never

// ============================================================================
// Page & Route Types
// ============================================================================

/**
 * Custom authentication page paths.
 *
 * Override default auth UI paths with custom pages.
 *
 * @example
 * ```typescript
 * const pages: AuthPages = {
 *   signIn: '/auth/login',
 *   signOut: '/auth/logout',
 *   error: '/auth/error',
 *   verifyRequest: '/auth/check-email',
 *   newUser: '/onboarding',
 * }
 * ```
 */
export interface AuthPages {
  /** Sign-in page path */
  signIn?: string

  /** Sign-out page path */
  signOut?: string

  /** Error page path */
  error?: string

  /** Email verification request page */
  verifyRequest?: string

  /** New user onboarding page */
  newUser?: string
}

/**
 * Props passed to custom sign-in pages.
 *
 * @example
 * ```typescript
 * // app/auth/login/page.tsx
 * import type { SignInPageProps } from '@cloudwerk/auth'
 *
 * export default function SignInPage({ providers, csrfToken, error }: SignInPageProps) {
 *   return (
 *     <form action="/auth/callback/credentials" method="post">
 *       <input type="hidden" name="csrfToken" value={csrfToken} />
 *       {error && <p class="error">{error}</p>}
 *       <input name="email" type="email" placeholder="Email" />
 *       <input name="password" type="password" placeholder="Password" />
 *       <button type="submit">Sign In</button>
 *       <hr />
 *       {providers.map((p) => (
 *         <a href={`/auth/signin/${p.id}`}>{p.name}</a>
 *       ))}
 *     </form>
 *   )
 * }
 * ```
 */
export interface SignInPageProps {
  /** Available authentication providers */
  providers: Array<{ id: string; name: string; type: ProviderType }>

  /** CSRF token for form submissions */
  csrfToken: string

  /** Callback URL after sign-in */
  callbackUrl: string

  /** Error message if sign-in failed */
  error?: string
}

/**
 * Props passed to custom sign-out pages.
 */
export interface SignOutPageProps {
  /** CSRF token for form submissions */
  csrfToken: string

  /** Callback URL after sign-out */
  callbackUrl: string
}

/**
 * Props passed to custom error pages.
 *
 * @example
 * ```typescript
 * // app/auth/error/page.tsx
 * import type { ErrorPageProps } from '@cloudwerk/auth'
 *
 * export default function AuthErrorPage({ error }: ErrorPageProps) {
 *   const messages: Record<string, string> = {
 *     Configuration: 'Server configuration error.',
 *     AccessDenied: 'Access denied.',
 *     Verification: 'Verification link expired.',
 *     Default: 'An error occurred.',
 *   }
 *
 *   return (
 *     <div>
 *       <h1>Authentication Error</h1>
 *       <p>{messages[error] ?? messages.Default}</p>
 *       <a href="/auth/login">Try again</a>
 *     </div>
 *   )
 * }
 * ```
 */
export interface ErrorPageProps {
  /** Error code */
  error: AuthErrorCode | string
}

// ============================================================================
// Context Integration Types
// ============================================================================

/**
 * Authentication context accessible via `getContext().get('auth')`.
 *
 * Provides access to the current session and user within request handlers.
 *
 * @typeParam TUser - User type
 * @typeParam TSession - Session type
 *
 * @example
 * ```typescript
 * import { getContext } from '@cloudwerk/core'
 * import type { AuthContext } from '@cloudwerk/auth'
 *
 * export function GET(request: Request) {
 *   const ctx = getContext()
 *   const auth = ctx.get<AuthContext>('auth')
 *
 *   if (!auth?.session) {
 *     return new Response('Unauthorized', { status: 401 })
 *   }
 *
 *   return json({ user: auth.user })
 * }
 * ```
 */
export interface AuthContext<TUser = User, TSession = Session> {
  /** Current session (null if not authenticated) */
  session: TSession | null

  /** Current user (null if not authenticated) */
  user: TUser | null

  /** Get the current session (throws if not authenticated) */
  getSession: () => TSession

  /** Get the current user (throws if not authenticated) */
  getUser: () => TUser

  /** Check if the user is authenticated */
  isAuthenticated: boolean
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Authentication error codes.
 */
export type AuthErrorCode =
  | 'Configuration'
  | 'AccessDenied'
  | 'Verification'
  | 'OAuthSignin'
  | 'OAuthCallback'
  | 'OAuthCreateAccount'
  | 'EmailCreateAccount'
  | 'Callback'
  | 'OAuthAccountNotLinked'
  | 'EmailSignin'
  | 'CredentialsSignin'
  | 'SessionRequired'
  | 'InvalidCSRF'
  | 'InvalidProvider'
  | 'InvalidCallback'

/**
 * Authentication error class.
 *
 * Thrown for authentication failures. Caught by error boundaries
 * and auth middleware.
 *
 * @example
 * ```typescript
 * import { AuthError } from '@cloudwerk/auth'
 *
 * // In a protected route handler
 * export function GET(request: Request) {
 *   const session = await getSession(request)
 *   if (!session) {
 *     throw new AuthError('SessionRequired', 'Authentication required')
 *   }
 *   // ...
 * }
 * ```
 */
export class AuthError extends Error {
  /** Error code for programmatic handling */
  readonly code: AuthErrorCode

  /** HTTP status code */
  readonly status: number

  /** The original error that caused this error */
  override readonly cause?: Error

  constructor(
    code: AuthErrorCode,
    message?: string,
    options?: { cause?: Error; status?: number }
  ) {
    super(message ?? code, { cause: options?.cause })
    this.name = 'AuthError'
    this.code = code
    this.status = options?.status ?? AuthError.getStatusForCode(code)
    this.cause = options?.cause
  }

  /**
   * Get appropriate HTTP status code for an error code.
   */
  static getStatusForCode(code: AuthErrorCode): number {
    switch (code) {
      case 'SessionRequired':
      case 'InvalidCSRF':
        return 401
      case 'AccessDenied':
        return 403
      case 'InvalidProvider':
      case 'InvalidCallback':
        return 404
      case 'Configuration':
      case 'OAuthSignin':
      case 'OAuthCallback':
      case 'OAuthCreateAccount':
      case 'EmailCreateAccount':
      case 'Callback':
      case 'OAuthAccountNotLinked':
      case 'EmailSignin':
      case 'CredentialsSignin':
      case 'Verification':
      default:
        return 500
    }
  }
}
