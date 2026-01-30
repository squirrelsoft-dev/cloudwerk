/**
 * @cloudwerk/auth - OAuth2 Provider Base
 *
 * Base class for OAuth 2.0 and OpenID Connect providers.
 */

import type { OAuthProvider, User } from '../../types.js'
import type {
  OAuth2Config,
  OIDCConfig,
  AuthorizationParams,
  OAuthProviderMethods,
  OIDCDiscoveryDocument,
} from './types.js'
import { exchangeCodeForTokens } from './tokens.js'
import { discoverOIDC } from './discovery.js'

/**
 * Create an OAuth 2.0 provider from configuration.
 *
 * This is the factory function for creating OAuth providers that don't use OIDC.
 *
 * @typeParam TProfile - Profile type returned by the provider
 * @param config - OAuth configuration
 * @returns OAuth provider with methods
 *
 * @example
 * ```typescript
 * const githubProvider = createOAuth2Provider<GitHubProfile>({
 *   id: 'github',
 *   name: 'GitHub',
 *   clientId: env.GITHUB_CLIENT_ID,
 *   clientSecret: env.GITHUB_CLIENT_SECRET,
 *   authorization: 'https://github.com/login/oauth/authorize',
 *   token: 'https://github.com/login/oauth/access_token',
 *   userinfo: 'https://api.github.com/user',
 *   scope: 'read:user user:email',
 *   profile(profile) {
 *     return {
 *       id: String(profile.id),
 *       email: profile.email,
 *       name: profile.name,
 *       image: profile.avatar_url,
 *     }
 *   },
 * })
 * ```
 */
export function createOAuth2Provider<TProfile = Record<string, unknown>>(
  config: OAuth2Config<TProfile>
): OAuthProvider<TProfile> & OAuthProviderMethods<TProfile> {
  const checks = config.checks ?? ['state']
  const clientAuth = config.clientAuth ?? 'client_secret_post'

  return {
    id: config.id,
    name: config.name,
    type: 'oauth',
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    authorization: config.authorization,
    token: config.token,
    userinfo: config.userinfo,
    scope: config.scope,
    checks,
    clientAuth,
    authorizationParams: config.authorizationParams,
    headers: config.headers,
    profile: config.profile,

    getAuthorizationUrl(options) {
      const url = new URL(config.authorization)

      const params: AuthorizationParams = {
        client_id: config.clientId,
        redirect_uri: options.redirectUri,
        response_type: 'code',
        scope: config.scope,
        ...config.authorizationParams,
      }

      // Add security checks
      if (checks.includes('state')) {
        params.state = options.state
      }

      if (checks.includes('pkce') && options.codeChallenge) {
        params.code_challenge = options.codeChallenge
        params.code_challenge_method = 'S256'
      }

      if (checks.includes('nonce') && options.nonce) {
        params.nonce = options.nonce
      }

      // Set all params
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
          url.searchParams.set(key, value)
        }
      }

      return url.toString()
    },

    async exchangeCode(options) {
      return exchangeCodeForTokens(
        config.token,
        {
          grant_type: 'authorization_code',
          code: options.code,
          redirect_uri: options.redirectUri,
          client_id: config.clientId,
          client_secret: config.clientSecret,
          code_verifier: options.codeVerifier,
        },
        {
          clientAuth,
          headers: config.headers,
        }
      )
    },

    async getUserProfile(tokens) {
      if (!config.userinfo) {
        throw new Error(`Provider ${config.id} does not have a userinfo endpoint`)
      }

      const response = await fetch(config.userinfo, {
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
          Accept: 'application/json',
          ...config.headers,
        },
      })

      if (!response.ok) {
        throw new Error(
          `Failed to fetch user profile: ${response.status} ${response.statusText}`
        )
      }

      return response.json() as Promise<TProfile>
    },

    async normalizeProfile(profile, tokens) {
      if (config.profile) {
        return config.profile(profile, tokens)
      }

      // Default normalization - tries common field names
      const raw = profile as Record<string, unknown>
      return {
        id: String(raw.id ?? raw.sub ?? ''),
        email: (raw.email as string) ?? null,
        name: (raw.name as string) ?? null,
        image: (raw.picture ?? raw.avatar_url ?? raw.avatar) as string | null,
      } as Partial<User>
    },
  }
}

/**
 * Create an OpenID Connect provider from configuration.
 *
 * OIDC providers use discovery to fetch endpoints automatically.
 *
 * @typeParam TProfile - Profile type returned by the provider
 * @param config - OIDC configuration
 * @returns OAuth provider with methods
 *
 * @example
 * ```typescript
 * const googleProvider = createOIDCProvider<GoogleProfile>({
 *   id: 'google',
 *   name: 'Google',
 *   clientId: env.GOOGLE_CLIENT_ID,
 *   clientSecret: env.GOOGLE_CLIENT_SECRET,
 *   wellKnown: 'https://accounts.google.com/.well-known/openid-configuration',
 *   scope: 'openid email profile',
 *   profile(profile) {
 *     return {
 *       id: profile.sub,
 *       email: profile.email,
 *       emailVerified: profile.email_verified ? new Date() : null,
 *       name: profile.name,
 *       image: profile.picture,
 *     }
 *   },
 * })
 * ```
 */
export function createOIDCProvider<TProfile = Record<string, unknown>>(
  config: OIDCConfig<TProfile>
): OAuthProvider<TProfile> & OAuthProviderMethods<TProfile> & { discover: () => Promise<OIDCDiscoveryDocument> } {
  const checks = config.checks ?? ['state', 'pkce']
  const clientAuth = config.clientAuth ?? 'client_secret_post'

  // Cache for discovered endpoints
  let discoveryDocument: OIDCDiscoveryDocument | null = null

  async function getDiscovery(): Promise<OIDCDiscoveryDocument> {
    if (!discoveryDocument) {
      discoveryDocument = await discoverOIDC(config.wellKnown)
    }
    return discoveryDocument
  }

  async function getTokenEndpoint(): Promise<string> {
    if (config.token) return config.token
    const discovery = await getDiscovery()
    return discovery.token_endpoint
  }

  async function getUserinfoEndpoint(): Promise<string | undefined> {
    if (config.userinfo) return config.userinfo
    const discovery = await getDiscovery()
    return discovery.userinfo_endpoint
  }

  return {
    id: config.id,
    name: config.name,
    type: 'oidc',
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    wellKnown: config.wellKnown,
    scope: config.scope ?? 'openid email profile',
    checks,
    clientAuth,
    authorizationParams: config.authorizationParams,
    headers: config.headers,
    profile: config.profile,

    async discover() {
      return getDiscovery()
    },

    getAuthorizationUrl(_options) {
      // For sync usage, we need the discovery to have been done
      // In practice, the caller should call discover() first
      throw new Error(
        'OIDC providers require async initialization. Use getAuthorizationUrlAsync() instead.'
      )
    },

    async exchangeCode(options) {
      const tokenEndpoint = await getTokenEndpoint()

      return exchangeCodeForTokens(
        tokenEndpoint,
        {
          grant_type: 'authorization_code',
          code: options.code,
          redirect_uri: options.redirectUri,
          client_id: config.clientId,
          client_secret: config.clientSecret,
          code_verifier: options.codeVerifier,
        },
        {
          clientAuth,
          headers: config.headers,
        }
      )
    },

    async getUserProfile(tokens) {
      const userinfoEndpoint = await getUserinfoEndpoint()

      if (!userinfoEndpoint) {
        // For OIDC, we can extract profile from ID token claims
        if (tokens.idToken) {
          return decodeIdTokenClaims(tokens.idToken) as TProfile
        }
        throw new Error(`Provider ${config.id} does not have a userinfo endpoint`)
      }

      const response = await fetch(userinfoEndpoint, {
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
          Accept: 'application/json',
          ...config.headers,
        },
      })

      if (!response.ok) {
        throw new Error(
          `Failed to fetch user profile: ${response.status} ${response.statusText}`
        )
      }

      return response.json() as Promise<TProfile>
    },

    async normalizeProfile(profile, tokens) {
      if (config.profile) {
        return config.profile(profile, tokens)
      }

      // OIDC standard claims
      const raw = profile as Record<string, unknown>
      return {
        id: String(raw.sub ?? ''),
        email: (raw.email as string) ?? null,
        emailVerified: raw.email_verified ? new Date() : null,
        name: (raw.name as string) ?? null,
        image: (raw.picture as string) ?? null,
      } as Partial<User>
    },
  }
}

/**
 * Get authorization URL for an OIDC provider (async version).
 *
 * @param provider - The OIDC provider
 * @param options - Authorization options
 * @returns Authorization URL
 */
export async function getOIDCAuthorizationUrl<TProfile>(
  provider: OAuthProvider<TProfile> & { discover?: () => Promise<OIDCDiscoveryDocument> },
  options: {
    redirectUri: string
    state: string
    codeChallenge?: string
    nonce?: string
  }
): Promise<string> {
  if (!provider.wellKnown) {
    throw new Error('Provider is not an OIDC provider')
  }

  // Get discovery document
  const discovery = provider.discover
    ? await provider.discover()
    : await discoverOIDC(provider.wellKnown)

  const url = new URL(
    (provider.authorization as string) ?? discovery.authorization_endpoint
  )

  const params: AuthorizationParams = {
    client_id: provider.clientId,
    redirect_uri: options.redirectUri,
    response_type: 'code',
    scope: provider.scope ?? 'openid email profile',
    ...provider.authorizationParams,
  }

  // Add security checks
  const checks = provider.checks ?? ['state', 'pkce']

  if (checks.includes('state')) {
    params.state = options.state
  }

  if (checks.includes('pkce') && options.codeChallenge) {
    params.code_challenge = options.codeChallenge
    params.code_challenge_method = 'S256'
  }

  if (checks.includes('nonce') && options.nonce) {
    params.nonce = options.nonce
  }

  // Set all params
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      url.searchParams.set(key, value)
    }
  }

  return url.toString()
}

// ============================================================================
// ID Token Utilities
// ============================================================================

/**
 * Decode ID token claims without verification.
 *
 * WARNING: This does NOT verify the token signature. Use only for
 * extracting claims after the token has been received from a trusted source
 * (i.e., directly from the token endpoint over HTTPS).
 *
 * @param idToken - The ID token JWT
 * @returns Decoded claims
 */
export function decodeIdTokenClaims(
  idToken: string
): Record<string, unknown> {
  const parts = idToken.split('.')

  if (parts.length !== 3) {
    throw new Error('Invalid ID token format')
  }

  const payload = parts[1]

  // Base64url decode
  let base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
  const padding = 4 - (base64.length % 4)
  if (padding !== 4) {
    base64 += '='.repeat(padding)
  }

  const json = atob(base64)
  return JSON.parse(json) as Record<string, unknown>
}

/**
 * Extract key ID from ID token header.
 *
 * @param idToken - The ID token JWT
 * @returns Key ID (kid) from header, or undefined
 */
export function getIdTokenKid(idToken: string): string | undefined {
  const parts = idToken.split('.')

  if (parts.length !== 3) {
    throw new Error('Invalid ID token format')
  }

  const header = parts[0]

  // Base64url decode
  let base64 = header.replace(/-/g, '+').replace(/_/g, '/')
  const padding = 4 - (base64.length % 4)
  if (padding !== 4) {
    base64 += '='.repeat(padding)
  }

  const json = atob(base64)
  const parsed = JSON.parse(json) as { kid?: string }
  return parsed.kid
}
