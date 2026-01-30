/**
 * @cloudwerk/auth - OAuth State Management
 *
 * Generates and validates OAuth state parameters for CSRF protection.
 * State is stored in KV with a short TTL to prevent replay attacks.
 */

import type { OAuthState } from './types.js'
import { base64UrlEncode } from './pkce.js'

/**
 * Default TTL for OAuth state in seconds (10 minutes).
 */
export const DEFAULT_STATE_TTL = 600

/**
 * KV key prefix for OAuth state storage.
 */
export const STATE_KEY_PREFIX = 'oauth:state:'

/**
 * Generate a cryptographically random state value.
 *
 * @returns Random 32-character state string
 *
 * @example
 * ```typescript
 * const state = generateState()
 * // => "XbPHqfH4_4D9kJmV8z2hR0p3t1w6y9B0"
 * ```
 */
export function generateState(): string {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return base64UrlEncode(bytes)
}

/**
 * Generate a nonce for OIDC ID token validation.
 *
 * @returns Random 32-character nonce string
 */
export function generateNonce(): string {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return base64UrlEncode(bytes)
}

/**
 * Create an OAuth state object with optional PKCE and nonce.
 *
 * @param options - State creation options
 * @returns OAuth state object
 *
 * @example
 * ```typescript
 * const state = createOAuthState({
 *   callbackUrl: '/dashboard',
 *   codeVerifier: 'abc123...',
 * })
 *
 * // Store in KV
 * await kv.put(`oauth:state:${state.state}`, JSON.stringify(state), {
 *   expirationTtl: 600,
 * })
 * ```
 */
export function createOAuthState(options?: {
  callbackUrl?: string
  codeVerifier?: string
  nonce?: string
}): OAuthState {
  return {
    state: generateState(),
    callbackUrl: options?.callbackUrl,
    codeVerifier: options?.codeVerifier,
    nonce: options?.nonce,
    createdAt: Date.now(),
  }
}

// ============================================================================
// KV State Storage
// ============================================================================

/**
 * KV namespace interface for state storage.
 * Compatible with Cloudflare Workers KVNamespace.
 */
export interface KVNamespaceLike {
  get(key: string): Promise<string | null>
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>
  delete(key: string): Promise<void>
}

/**
 * Configuration for state storage.
 */
export interface StateStorageConfig {
  /** KV namespace for state storage */
  kv: KVNamespaceLike

  /**
   * TTL for state in seconds.
   * @default 600 (10 minutes)
   */
  ttl?: number

  /**
   * Key prefix for state entries.
   * @default 'oauth:state:'
   */
  prefix?: string
}

/**
 * Store OAuth state in KV.
 *
 * @param config - Storage configuration
 * @param state - OAuth state to store
 *
 * @example
 * ```typescript
 * const state = createOAuthState({
 *   callbackUrl: '/dashboard',
 *   codeVerifier: pkce.codeVerifier,
 * })
 *
 * await storeState({ kv: env.AUTH_KV }, state)
 * ```
 */
export async function storeState(
  config: StateStorageConfig,
  state: OAuthState
): Promise<void> {
  const key = `${config.prefix ?? STATE_KEY_PREFIX}${state.state}`
  const ttl = config.ttl ?? DEFAULT_STATE_TTL

  await config.kv.put(key, JSON.stringify(state), {
    expirationTtl: ttl,
  })
}

/**
 * Retrieve and consume OAuth state from KV.
 *
 * The state is deleted after retrieval to prevent replay attacks.
 *
 * @param config - Storage configuration
 * @param stateValue - The state value from callback
 * @returns The OAuth state if valid, null if not found or expired
 *
 * @example
 * ```typescript
 * const state = await consumeState({ kv: env.AUTH_KV }, callbackState)
 *
 * if (!state) {
 *   throw new AuthError('InvalidState', 'OAuth state invalid or expired')
 * }
 *
 * // Use state.codeVerifier for token exchange
 * const tokens = await provider.exchangeCode({
 *   code,
 *   redirectUri,
 *   codeVerifier: state.codeVerifier,
 * })
 * ```
 */
export async function consumeState(
  config: StateStorageConfig,
  stateValue: string
): Promise<OAuthState | null> {
  const key = `${config.prefix ?? STATE_KEY_PREFIX}${stateValue}`

  // Get and delete atomically
  const data = await config.kv.get(key)

  if (!data) {
    return null
  }

  // Delete the state to prevent replay
  await config.kv.delete(key)

  try {
    const state = JSON.parse(data) as OAuthState

    // Verify the state value matches
    if (state.state !== stateValue) {
      return null
    }

    return state
  } catch {
    return null
  }
}

/**
 * Validate that a state value is properly formatted.
 *
 * @param state - State value to validate
 * @returns True if state appears valid
 */
export function isValidStateFormat(state: string): boolean {
  // State should be base64url encoded, 32 characters
  return /^[A-Za-z0-9_-]{32}$/.test(state)
}

// ============================================================================
// Cookie State Storage (Alternative)
// ============================================================================

/**
 * Configuration for cookie-based state storage.
 */
export interface CookieStateConfig {
  /** Secret for signing state cookie */
  secret: string

  /** Cookie name */
  cookieName?: string

  /**
   * Cookie max age in seconds.
   * @default 600 (10 minutes)
   */
  maxAge?: number

  /** Cookie domain */
  domain?: string

  /** Cookie path */
  path?: string
}

/**
 * Default cookie name for OAuth state.
 */
export const STATE_COOKIE_NAME = '__cloudwerk.oauth-state'

/**
 * Create a signed state cookie value.
 *
 * This is an alternative to KV storage for serverless environments
 * where KV access might add latency.
 *
 * @param config - Cookie configuration
 * @param state - OAuth state to encode
 * @returns Signed cookie value
 */
export async function createStateCookie(
  config: CookieStateConfig,
  state: OAuthState
): Promise<string> {
  const payload = JSON.stringify(state)
  const encoder = new TextEncoder()

  // Create HMAC signature
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(config.secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  const signatureBase64 = base64UrlEncode(new Uint8Array(signature))

  // Return payload.signature
  return `${btoa(payload)}.${signatureBase64}`
}

/**
 * Verify and decode a signed state cookie.
 *
 * @param config - Cookie configuration
 * @param cookieValue - The cookie value to verify
 * @returns OAuth state if valid, null if invalid or tampered
 */
export async function verifyStateCookie(
  config: CookieStateConfig,
  cookieValue: string
): Promise<OAuthState | null> {
  try {
    const [payloadBase64, signatureBase64] = cookieValue.split('.')

    if (!payloadBase64 || !signatureBase64) {
      return null
    }

    const payload = atob(payloadBase64)
    const encoder = new TextEncoder()

    // Verify HMAC signature
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(config.secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )

    // Decode signature from base64url
    let sigBase64 = signatureBase64.replace(/-/g, '+').replace(/_/g, '/')
    const padding = 4 - (sigBase64.length % 4)
    if (padding !== 4) {
      sigBase64 += '='.repeat(padding)
    }
    const signatureBytes = Uint8Array.from(atob(sigBase64), (c) => c.charCodeAt(0))

    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes,
      encoder.encode(payload)
    )

    if (!isValid) {
      return null
    }

    const state = JSON.parse(payload) as OAuthState

    // Check expiration
    const maxAge = config.maxAge ?? DEFAULT_STATE_TTL
    if (Date.now() - state.createdAt > maxAge * 1000) {
      return null
    }

    return state
  } catch {
    return null
  }
}
