/**
 * @cloudwerk/auth - PKCE Utilities
 *
 * Proof Key for Code Exchange (PKCE) implementation using Web Crypto API.
 * Used for OAuth 2.0 authorization code flow with S256 code challenge.
 */

import type { PKCEPair } from './types.js'

/**
 * Generate a cryptographically random code verifier.
 *
 * The verifier is a random string of 43-128 characters from the unreserved
 * character set [A-Z] / [a-z] / [0-9] / "-" / "." / "_" / "~".
 *
 * We use 64 bytes (86 base64url characters) for strong entropy.
 *
 * @returns Random code verifier string
 *
 * @example
 * ```typescript
 * const verifier = generateCodeVerifier()
 * // => "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk..."
 * ```
 */
export function generateCodeVerifier(): string {
  const randomBytes = new Uint8Array(64)
  crypto.getRandomValues(randomBytes)
  return base64UrlEncode(randomBytes)
}

/**
 * Generate S256 code challenge from a code verifier.
 *
 * The challenge is the SHA-256 hash of the verifier, base64url encoded.
 *
 * @param codeVerifier - The code verifier to hash
 * @returns Promise resolving to the code challenge
 *
 * @example
 * ```typescript
 * const verifier = generateCodeVerifier()
 * const challenge = await generateCodeChallenge(verifier)
 * // => "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"
 * ```
 */
export async function generateCodeChallenge(
  codeVerifier: string
): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(codeVerifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return base64UrlEncode(new Uint8Array(digest))
}

/**
 * Generate a complete PKCE pair (verifier and challenge).
 *
 * This is the primary function for initiating PKCE-protected OAuth flows.
 *
 * @returns Promise resolving to PKCE code verifier and challenge
 *
 * @example
 * ```typescript
 * const pkce = await generatePKCE()
 *
 * // Store verifier server-side for callback verification
 * await kv.put(`pkce:${state}`, pkce.codeVerifier, { expirationTtl: 600 })
 *
 * // Send challenge in authorization request
 * const authUrl = new URL(authEndpoint)
 * authUrl.searchParams.set('code_challenge', pkce.codeChallenge)
 * authUrl.searchParams.set('code_challenge_method', 'S256')
 * ```
 */
export async function generatePKCE(): Promise<PKCEPair> {
  const codeVerifier = generateCodeVerifier()
  const codeChallenge = await generateCodeChallenge(codeVerifier)

  return {
    codeVerifier,
    codeChallenge,
    codeChallengeMethod: 'S256',
  }
}

/**
 * Verify that a code verifier matches a code challenge.
 *
 * Used in the callback to verify the PKCE exchange if doing server-side
 * verification (unusual - typically the OAuth provider verifies this).
 *
 * @param codeVerifier - The code verifier to verify
 * @param codeChallenge - The expected code challenge
 * @returns Promise resolving to true if verifier matches challenge
 *
 * @example
 * ```typescript
 * const storedVerifier = await kv.get(`pkce:${state}`)
 * const isValid = await verifyCodeChallenge(storedVerifier, expectedChallenge)
 *
 * if (!isValid) {
 *   throw new Error('PKCE verification failed')
 * }
 * ```
 */
export async function verifyCodeChallenge(
  codeVerifier: string,
  codeChallenge: string
): Promise<boolean> {
  const expectedChallenge = await generateCodeChallenge(codeVerifier)
  return timingSafeEqual(expectedChallenge, codeChallenge)
}

// ============================================================================
// Encoding Utilities
// ============================================================================

/**
 * Encode bytes as base64url (URL-safe base64 without padding).
 *
 * @param bytes - Bytes to encode
 * @returns Base64url encoded string
 */
export function base64UrlEncode(bytes: Uint8Array): string {
  // Convert to binary string
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }

  // Encode to base64 and convert to base64url
  const base64 = btoa(binary)
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/**
 * Decode base64url string to bytes.
 *
 * @param str - Base64url encoded string
 * @returns Decoded bytes
 */
export function base64UrlDecode(str: string): Uint8Array {
  // Convert base64url to base64
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/')

  // Add padding if needed
  const padding = 4 - (base64.length % 4)
  if (padding !== 4) {
    base64 += '='.repeat(padding)
  }

  // Decode from base64
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }

  return bytes
}

/**
 * Timing-safe string comparison to prevent timing attacks.
 *
 * @param a - First string
 * @param b - Second string
 * @returns True if strings are equal
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }

  return result === 0
}
