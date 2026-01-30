/**
 * @cloudwerk/auth - Providers Module
 *
 * Authentication providers for @cloudwerk/auth.
 *
 * @example
 * ```typescript
 * import { github, google, discord, credentials } from '@cloudwerk/auth/providers'
 *
 * // OAuth providers
 * const providers = [
 *   github({
 *     clientId: env.GITHUB_CLIENT_ID,
 *     clientSecret: env.GITHUB_CLIENT_SECRET,
 *   }),
 *   google({
 *     clientId: env.GOOGLE_CLIENT_ID,
 *     clientSecret: env.GOOGLE_CLIENT_SECRET,
 *   }),
 *   discord({
 *     clientId: env.DISCORD_CLIENT_ID,
 *     clientSecret: env.DISCORD_CLIENT_SECRET,
 *   }),
 *   credentials({
 *     async authorize(creds, ctx) {
 *       const user = await findUser(ctx.env.DB, creds.email)
 *       if (!user || !await verifyPassword(creds.password, user.hash)) {
 *         return null
 *       }
 *       return { id: user.id, email: user.email, emailVerified: null }
 *     }
 *   }),
 * ]
 * ```
 */

// ============================================================================
// OAuth Providers
// ============================================================================

// GitHub OAuth
export { github } from './github.js'
export type { GitHubConfig, GitHubProfile, GitHubEmail } from './github.js'

// Google OAuth/OIDC
export { google } from './google.js'
export type { GoogleConfig, GoogleProfile } from './google.js'

// Discord OAuth
export { discord, getDiscordAvatarUrl, getDiscordBannerUrl } from './discord.js'
export type { DiscordConfig, DiscordProfile } from './discord.js'

// ============================================================================
// Credentials Provider
// ============================================================================

export { credentials, handleCredentialsSignIn } from './credentials.js'

// Credentials types
export type {
  CredentialsConfig,
  CredentialsAuthorizeContext,
  AuthorizeResult,
  HandleCredentialsSignInOptions,
  CredentialsSignInHandlerConfig,
  CredentialsSignInResult,
} from './types.js'

// ============================================================================
// OAuth Infrastructure (re-exported from oauth module)
// ============================================================================

export {
  // PKCE utilities
  generateCodeVerifier,
  generateCodeChallenge,
  generatePKCE,
  verifyCodeChallenge,
  base64UrlEncode,
  base64UrlDecode,
  // State management
  generateState,
  generateNonce,
  createOAuthState,
  storeState,
  consumeState,
  isValidStateFormat,
  createStateCookie,
  verifyStateCookie,
  DEFAULT_STATE_TTL,
  STATE_KEY_PREFIX,
  STATE_COOKIE_NAME,
  // Token utilities
  exchangeCodeForTokens,
  refreshAccessToken,
  normalizeTokenResponse,
  calculateTokenExpiry,
  isTokenExpired,
  introspectToken,
  revokeToken,
  OAuthTokenError,
  // OIDC discovery
  discoverOIDC,
  getWellKnownUrl,
  clearDiscoveryCache,
  fetchJWKS,
  clearJWKSCache,
  findJWKByKid,
  WELL_KNOWN_PROVIDERS,
  OIDCDiscoveryError,
  // Base provider factories
  createOAuth2Provider,
  createOIDCProvider,
  getOIDCAuthorizationUrl,
  decodeIdTokenClaims,
  getIdTokenKid,
} from './oauth/index.js'

// OAuth types
export type {
  OAuth2Config,
  OIDCConfig,
  OAuthCheck,
  PKCEPair,
  OAuthState,
  AuthorizationParams,
  TokenRequestParams,
  TokenResponse,
  OIDCDiscoveryDocument,
  OAuthProviderMethods,
  OAuthProviderWithMethods,
  StateStorageConfig,
  CookieStateConfig,
  KVNamespaceLike,
  TokenIntrospectionResponse,
  JWK,
  JWKS,
} from './oauth/index.js'

// ============================================================================
// Email (Magic Link) Provider
// ============================================================================

export {
  email,
  handleEmailSignIn,
  handleEmailCallback,
  createKVTokenStorage,
  DEFAULT_EMAIL_TOKEN_MAX_AGE,
} from './email.js'

export type {
  EmailConfig,
  EmailTokenStorage,
  HandleEmailSignInOptions,
  KVNamespaceLike as EmailKVNamespaceLike,
} from './email.js'

// ============================================================================
// Passkey (WebAuthn) Provider
// ============================================================================

export {
  passkey,
  generateRegistrationOptions,
  verifyRegistration,
  generateAuthenticationOptions,
  verifyAuthentication,
  createKVChallengeStorage,
  createD1CredentialStorage,
  DEFAULT_REGISTRATION_TIMEOUT,
  DEFAULT_AUTHENTICATION_TIMEOUT,
  DEFAULT_SUPPORTED_ALGORITHMS,
} from './webauthn/index.js'

export type {
  WebAuthnConfig,
  PublicKeyCredentialCreationOptions,
  PublicKeyCredentialRequestOptions,
  RegistrationResponse,
  AuthenticationResponse,
  VerifiedRegistration,
  VerifiedAuthentication,
  StoredCredential,
  CredentialStorage,
  ChallengeStorage,
  AuthenticatorAttachment,
  ResidentKeyRequirement,
  UserVerificationRequirement,
  AttestationConveyancePreference,
  AuthenticatorTransport,
  COSEAlgorithmIdentifier,
  KVNamespaceLike as PasskeyKVNamespaceLike,
  D1DatabaseLike,
  D1PreparedStatementLike,
  D1Result,
} from './webauthn/index.js'
