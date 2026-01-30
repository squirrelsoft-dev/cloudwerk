/**
 * @cloudwerk/auth - OAuth Token Utilities
 *
 * Token exchange and refresh utilities for OAuth 2.0 providers.
 */

import type { TokenSet } from '../../types.js'
import type { TokenRequestParams, TokenResponse } from './types.js'

/**
 * Exchange authorization code for tokens.
 *
 * Performs the token exchange with the OAuth provider's token endpoint.
 *
 * @param tokenEndpoint - Provider's token endpoint URL
 * @param params - Token request parameters
 * @param options - Additional options
 * @returns Token set from provider
 *
 * @example
 * ```typescript
 * const tokens = await exchangeCodeForTokens(
 *   'https://github.com/login/oauth/access_token',
 *   {
 *     grant_type: 'authorization_code',
 *     code: callbackCode,
 *     redirect_uri: 'https://myapp.com/auth/callback/github',
 *     client_id: env.GITHUB_CLIENT_ID,
 *     client_secret: env.GITHUB_CLIENT_SECRET,
 *   }
 * )
 * ```
 */
export async function exchangeCodeForTokens(
  tokenEndpoint: string,
  params: TokenRequestParams,
  options?: {
    /** Client authentication method */
    clientAuth?: 'client_secret_basic' | 'client_secret_post'
    /** Additional headers */
    headers?: Record<string, string>
  }
): Promise<TokenSet> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
    Accept: 'application/json',
    ...options?.headers,
  }

  // Build request body
  const body = new URLSearchParams()
  body.set('grant_type', params.grant_type)
  body.set('code', params.code)
  body.set('redirect_uri', params.redirect_uri)

  // Handle client authentication
  if (options?.clientAuth === 'client_secret_basic') {
    // HTTP Basic authentication
    const credentials = btoa(`${params.client_id}:${params.client_secret}`)
    headers['Authorization'] = `Basic ${credentials}`
  } else {
    // client_secret_post (default)
    if (params.client_id) {
      body.set('client_id', params.client_id)
    }
    if (params.client_secret) {
      body.set('client_secret', params.client_secret)
    }
  }

  // Add PKCE code verifier if present
  if (params.code_verifier) {
    body.set('code_verifier', params.code_verifier)
  }

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers,
    body: body.toString(),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new OAuthTokenError(
      `Token exchange failed: ${response.status} ${response.statusText}`,
      error
    )
  }

  const data = (await response.json()) as TokenResponse

  return normalizeTokenResponse(data)
}

/**
 * Refresh an access token using a refresh token.
 *
 * @param tokenEndpoint - Provider's token endpoint URL
 * @param refreshToken - The refresh token
 * @param clientCredentials - Client ID and secret
 * @param options - Additional options
 * @returns New token set
 *
 * @example
 * ```typescript
 * const newTokens = await refreshAccessToken(
 *   'https://oauth2.googleapis.com/token',
 *   storedRefreshToken,
 *   {
 *     clientId: env.GOOGLE_CLIENT_ID,
 *     clientSecret: env.GOOGLE_CLIENT_SECRET,
 *   }
 * )
 * ```
 */
export async function refreshAccessToken(
  tokenEndpoint: string,
  refreshToken: string,
  clientCredentials: {
    clientId: string
    clientSecret: string
  },
  options?: {
    /** Client authentication method */
    clientAuth?: 'client_secret_basic' | 'client_secret_post'
    /** Additional headers */
    headers?: Record<string, string>
    /** Requested scopes (optional, usually not needed for refresh) */
    scope?: string
  }
): Promise<TokenSet> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
    Accept: 'application/json',
    ...options?.headers,
  }

  const body = new URLSearchParams()
  body.set('grant_type', 'refresh_token')
  body.set('refresh_token', refreshToken)

  if (options?.scope) {
    body.set('scope', options.scope)
  }

  // Handle client authentication
  if (options?.clientAuth === 'client_secret_basic') {
    const credentials = btoa(
      `${clientCredentials.clientId}:${clientCredentials.clientSecret}`
    )
    headers['Authorization'] = `Basic ${credentials}`
  } else {
    body.set('client_id', clientCredentials.clientId)
    body.set('client_secret', clientCredentials.clientSecret)
  }

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers,
    body: body.toString(),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new OAuthTokenError(
      `Token refresh failed: ${response.status} ${response.statusText}`,
      error
    )
  }

  const data = (await response.json()) as TokenResponse

  // Preserve original refresh token if not returned
  const tokens = normalizeTokenResponse(data)
  if (!tokens.refreshToken) {
    tokens.refreshToken = refreshToken
  }

  return tokens
}

/**
 * Normalize token response to standard TokenSet format.
 *
 * @param response - Raw token response from provider
 * @returns Normalized token set
 */
export function normalizeTokenResponse(response: TokenResponse): TokenSet {
  return {
    accessToken: response.access_token,
    tokenType: response.token_type,
    expiresIn: response.expires_in,
    refreshToken: response.refresh_token,
    scope: response.scope,
    idToken: response.id_token,
  }
}

/**
 * Calculate token expiration timestamp.
 *
 * @param expiresIn - Token expiration in seconds
 * @param issuedAt - When the token was issued (default: now)
 * @returns Expiration timestamp in milliseconds
 */
export function calculateTokenExpiry(
  expiresIn: number,
  issuedAt: number = Date.now()
): number {
  return issuedAt + expiresIn * 1000
}

/**
 * Check if a token is expired or about to expire.
 *
 * @param expiresAt - Token expiration timestamp in milliseconds
 * @param buffer - Buffer time in seconds before expiration (default: 60)
 * @returns True if token is expired or will expire within buffer
 */
export function isTokenExpired(expiresAt: number, buffer: number = 60): boolean {
  return Date.now() >= expiresAt - buffer * 1000
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Error thrown during OAuth token operations.
 */
export class OAuthTokenError extends Error {
  /** The raw error response from the provider */
  readonly rawError?: string

  constructor(message: string, rawError?: string) {
    super(message)
    this.name = 'OAuthTokenError'
    this.rawError = rawError
  }
}

// ============================================================================
// Token Introspection (RFC 7662)
// ============================================================================

/**
 * Token introspection response.
 */
export interface TokenIntrospectionResponse {
  /** Whether the token is active */
  active: boolean
  /** Token scope */
  scope?: string
  /** Client ID the token was issued to */
  client_id?: string
  /** Subject (user) identifier */
  sub?: string
  /** Token expiration timestamp */
  exp?: number
  /** Token issued at timestamp */
  iat?: number
  /** Token type hint */
  token_type?: string
}

/**
 * Introspect a token to check its validity.
 *
 * Note: Not all OAuth providers support token introspection.
 *
 * @param introspectionEndpoint - Provider's introspection endpoint
 * @param token - The token to introspect
 * @param clientCredentials - Client ID and secret
 * @param tokenTypeHint - Optional hint about token type ('access_token' or 'refresh_token')
 * @returns Introspection response
 */
export async function introspectToken(
  introspectionEndpoint: string,
  token: string,
  clientCredentials: {
    clientId: string
    clientSecret: string
  },
  tokenTypeHint?: 'access_token' | 'refresh_token'
): Promise<TokenIntrospectionResponse> {
  const body = new URLSearchParams()
  body.set('token', token)

  if (tokenTypeHint) {
    body.set('token_type_hint', tokenTypeHint)
  }

  const credentials = btoa(
    `${clientCredentials.clientId}:${clientCredentials.clientSecret}`
  )

  const response = await fetch(introspectionEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      Authorization: `Basic ${credentials}`,
    },
    body: body.toString(),
  })

  if (!response.ok) {
    throw new OAuthTokenError(
      `Token introspection failed: ${response.status} ${response.statusText}`
    )
  }

  return response.json() as Promise<TokenIntrospectionResponse>
}

// ============================================================================
// Token Revocation (RFC 7009)
// ============================================================================

/**
 * Revoke a token.
 *
 * Note: Not all OAuth providers support token revocation.
 *
 * @param revocationEndpoint - Provider's revocation endpoint
 * @param token - The token to revoke
 * @param clientCredentials - Client ID and secret
 * @param tokenTypeHint - Optional hint about token type
 */
export async function revokeToken(
  revocationEndpoint: string,
  token: string,
  clientCredentials: {
    clientId: string
    clientSecret: string
  },
  tokenTypeHint?: 'access_token' | 'refresh_token'
): Promise<void> {
  const body = new URLSearchParams()
  body.set('token', token)

  if (tokenTypeHint) {
    body.set('token_type_hint', tokenTypeHint)
  }

  const credentials = btoa(
    `${clientCredentials.clientId}:${clientCredentials.clientSecret}`
  )

  const response = await fetch(revocationEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${credentials}`,
    },
    body: body.toString(),
  })

  // Revocation endpoint returns 200 even if token was already revoked
  if (!response.ok) {
    throw new OAuthTokenError(
      `Token revocation failed: ${response.status} ${response.statusText}`
    )
  }
}
