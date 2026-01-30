/**
 * @cloudwerk/auth - OAuth Module
 *
 * OAuth 2.0 and OpenID Connect provider infrastructure.
 */

// Types
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
  GitHubConfig,
  GitHubProfile,
  GitHubEmail,
  GoogleConfig,
  GoogleProfile,
  DiscordConfig,
  DiscordProfile,
  OAuthProviderMethods,
  OAuthProviderWithMethods,
} from './types.js'

// PKCE utilities
export {
  generateCodeVerifier,
  generateCodeChallenge,
  generatePKCE,
  verifyCodeChallenge,
  base64UrlEncode,
  base64UrlDecode,
} from './pkce.js'

// State management
export {
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
} from './state.js'

export type { StateStorageConfig, CookieStateConfig, KVNamespaceLike } from './state.js'

// Token utilities
export {
  exchangeCodeForTokens,
  refreshAccessToken,
  normalizeTokenResponse,
  calculateTokenExpiry,
  isTokenExpired,
  introspectToken,
  revokeToken,
  OAuthTokenError,
} from './tokens.js'

export type { TokenIntrospectionResponse } from './tokens.js'

// OIDC discovery
export {
  discoverOIDC,
  getWellKnownUrl,
  clearDiscoveryCache,
  fetchJWKS,
  clearJWKSCache,
  findJWKByKid,
  WELL_KNOWN_PROVIDERS,
  OIDCDiscoveryError,
} from './discovery.js'

export type { JWK, JWKS } from './discovery.js'

// Base provider factory
export {
  createOAuth2Provider,
  createOIDCProvider,
  getOIDCAuthorizationUrl,
  decodeIdTokenClaims,
  getIdTokenKid,
} from './base.js'
