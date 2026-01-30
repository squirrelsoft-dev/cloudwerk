/**
 * @cloudwerk/auth - OAuth Provider Types
 *
 * Type definitions for OAuth 2.0 and OpenID Connect providers.
 */

import type { Awaitable, OAuthProvider, TokenSet, User } from '../../types.js'

// ============================================================================
// OAuth Configuration Types
// ============================================================================

/**
 * Configuration for OAuth 2.0 providers.
 *
 * @typeParam TProfile - Profile type returned by the provider
 */
export interface OAuth2Config<TProfile = Record<string, unknown>> {
  /** Unique provider identifier (e.g., 'github', 'google') */
  id: string

  /** Display name for the provider */
  name: string

  /** OAuth client ID */
  clientId: string

  /** OAuth client secret */
  clientSecret: string

  /** Authorization endpoint URL */
  authorization: string

  /** Token endpoint URL */
  token: string

  /** User info endpoint URL */
  userinfo?: string

  /** OAuth scopes to request (space-separated) */
  scope?: string

  /**
   * Security checks to perform.
   * @default ['state']
   */
  checks?: OAuthCheck[]

  /**
   * Client authentication method for token endpoint.
   * @default 'client_secret_post'
   */
  clientAuth?: 'client_secret_basic' | 'client_secret_post'

  /** Additional authorization parameters */
  authorizationParams?: Record<string, string>

  /** Custom headers for token request */
  headers?: Record<string, string>

  /**
   * Transform provider profile to user data.
   */
  profile?: (profile: TProfile, tokens: TokenSet) => Awaitable<Partial<User>>
}

/**
 * Configuration for OpenID Connect providers.
 *
 * @typeParam TProfile - Profile type returned by the provider
 */
export interface OIDCConfig<TProfile = Record<string, unknown>>
  extends Omit<OAuth2Config<TProfile>, 'authorization' | 'token' | 'userinfo'> {
  /** OIDC well-known configuration URL */
  wellKnown: string

  /** Optional overrides for discovered endpoints */
  authorization?: string
  token?: string
  userinfo?: string
}

/**
 * Security checks for OAuth flow.
 */
export type OAuthCheck = 'state' | 'pkce' | 'nonce'

// ============================================================================
// OAuth Flow Types
// ============================================================================

/**
 * PKCE code challenge and verifier pair.
 */
export interface PKCEPair {
  /** The code verifier (random string) */
  codeVerifier: string

  /** The code challenge (SHA-256 hash of verifier, base64url encoded) */
  codeChallenge: string

  /** The challenge method (always 'S256') */
  codeChallengeMethod: 'S256'
}

/**
 * OAuth state for CSRF protection.
 */
export interface OAuthState {
  /** Random state value */
  state: string

  /** Original callback URL */
  callbackUrl?: string

  /** PKCE code verifier (stored server-side) */
  codeVerifier?: string

  /** OIDC nonce for ID token validation */
  nonce?: string

  /** When the state was created */
  createdAt: number
}

/**
 * Authorization URL parameters.
 */
export interface AuthorizationParams {
  /** OAuth client ID */
  client_id: string

  /** Redirect URI for callback */
  redirect_uri: string

  /** Response type (always 'code' for authorization code flow) */
  response_type: 'code'

  /** Requested scopes */
  scope?: string

  /** State for CSRF protection */
  state?: string

  /** PKCE code challenge */
  code_challenge?: string

  /** PKCE code challenge method */
  code_challenge_method?: 'S256'

  /** OIDC nonce */
  nonce?: string

  /** Additional custom parameters */
  [key: string]: string | undefined
}

/**
 * Token exchange request parameters.
 */
export interface TokenRequestParams {
  /** Grant type (always 'authorization_code') */
  grant_type: 'authorization_code'

  /** Authorization code from callback */
  code: string

  /** Redirect URI (must match authorization request) */
  redirect_uri: string

  /** OAuth client ID */
  client_id?: string

  /** OAuth client secret */
  client_secret?: string

  /** PKCE code verifier */
  code_verifier?: string
}

/**
 * Token response from OAuth provider.
 */
export interface TokenResponse {
  /** Access token */
  access_token: string

  /** Token type (usually 'Bearer') */
  token_type: string

  /** Token expiration in seconds */
  expires_in?: number

  /** Refresh token */
  refresh_token?: string

  /** Granted scopes */
  scope?: string

  /** OIDC ID token (JWT) */
  id_token?: string
}

// ============================================================================
// OIDC Discovery Types
// ============================================================================

/**
 * OIDC well-known configuration response.
 *
 * Only includes commonly used fields. Full spec has many more.
 */
export interface OIDCDiscoveryDocument {
  /** Authorization endpoint */
  authorization_endpoint: string

  /** Token endpoint */
  token_endpoint: string

  /** Userinfo endpoint */
  userinfo_endpoint?: string

  /** JWKS URI for token validation */
  jwks_uri?: string

  /** Issuer identifier */
  issuer: string

  /** Supported response types */
  response_types_supported: string[]

  /** Supported scopes */
  scopes_supported?: string[]

  /** Supported token endpoint auth methods */
  token_endpoint_auth_methods_supported?: string[]

  /** Supported code challenge methods */
  code_challenge_methods_supported?: string[]

  /** Supported claims */
  claims_supported?: string[]
}

// ============================================================================
// Provider-Specific Types
// ============================================================================

/**
 * GitHub OAuth configuration.
 */
export interface GitHubConfig {
  /** OAuth client ID */
  clientId: string

  /** OAuth client secret */
  clientSecret: string

  /**
   * OAuth scopes to request.
   * @default 'read:user user:email'
   */
  scope?: string

  /**
   * Whether to allow sign-ups from users with unverified emails.
   * @default false
   */
  allowDangerousEmailAccountLinking?: boolean
}

/**
 * GitHub user profile from API.
 */
export interface GitHubProfile {
  /** GitHub user ID */
  id: number

  /** GitHub username */
  login: string

  /** Display name */
  name: string | null

  /** Email (may be null if private) */
  email: string | null

  /** Avatar URL */
  avatar_url: string

  /** Profile URL */
  html_url: string

  /** Bio */
  bio: string | null

  /** Company */
  company: string | null

  /** Location */
  location: string | null
}

/**
 * GitHub email from emails API.
 */
export interface GitHubEmail {
  email: string
  primary: boolean
  verified: boolean
  visibility: string | null
}

/**
 * Google OAuth configuration.
 */
export interface GoogleConfig {
  /** OAuth client ID */
  clientId: string

  /** OAuth client secret */
  clientSecret: string

  /**
   * OAuth scopes to request.
   * @default 'openid email profile'
   */
  scope?: string

  /**
   * Additional authorization parameters.
   * e.g., { access_type: 'offline', prompt: 'consent' } for refresh tokens
   */
  authorizationParams?: Record<string, string>
}

/**
 * Google user profile from OIDC.
 */
export interface GoogleProfile {
  /** Subject identifier */
  sub: string

  /** Email address */
  email: string

  /** Whether email is verified */
  email_verified: boolean

  /** Display name */
  name: string

  /** Given name */
  given_name?: string

  /** Family name */
  family_name?: string

  /** Profile picture URL */
  picture?: string

  /** Locale */
  locale?: string
}

/**
 * Discord OAuth configuration.
 */
export interface DiscordConfig {
  /** OAuth client ID */
  clientId: string

  /** OAuth client secret */
  clientSecret: string

  /**
   * OAuth scopes to request.
   * @default 'identify email'
   */
  scope?: string
}

/**
 * Discord user profile from API.
 */
export interface DiscordProfile {
  /** Discord user ID (snowflake) */
  id: string

  /** Username */
  username: string

  /** Discriminator (legacy, now '0' for most users) */
  discriminator: string

  /** Global display name */
  global_name: string | null

  /** Avatar hash */
  avatar: string | null

  /** Email address */
  email: string | null

  /** Whether email is verified */
  verified: boolean

  /** User flags */
  flags: number

  /** Premium type */
  premium_type: number
}

// ============================================================================
// OAuth Provider Base Class Types
// ============================================================================

/**
 * Interface for OAuth provider implementations.
 */
export interface OAuthProviderMethods<TProfile = Record<string, unknown>> {
  /**
   * Get the authorization URL for initiating OAuth flow.
   */
  getAuthorizationUrl(options: {
    redirectUri: string
    state: string
    codeChallenge?: string
    nonce?: string
  }): string

  /**
   * Exchange authorization code for tokens.
   */
  exchangeCode(options: {
    code: string
    redirectUri: string
    codeVerifier?: string
  }): Promise<TokenSet>

  /**
   * Get user profile from provider.
   */
  getUserProfile(tokens: TokenSet): Promise<TProfile>

  /**
   * Transform provider profile to user data.
   */
  normalizeProfile(profile: TProfile, tokens: TokenSet): Promise<Partial<User>>
}

/**
 * Complete OAuth provider with configuration and methods.
 */
export type OAuthProviderWithMethods<TProfile = Record<string, unknown>> =
  OAuthProvider<TProfile> & OAuthProviderMethods<TProfile>
