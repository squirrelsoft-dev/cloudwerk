/**
 * @cloudwerk/auth - Token Generation Utilities
 *
 * Provides cryptographically secure token generation for
 * password reset tokens, verification tokens, API keys, etc.
 */

import { DEFAULT_TOKEN_BYTES } from './constants.js'

// ============================================================================
// Token Generation
// ============================================================================

/**
 * Generate a cryptographically secure random token in hex format.
 *
 * Uses Web Crypto API for secure random number generation.
 *
 * @param bytes - Number of random bytes (default: 32, produces 64 hex chars)
 * @returns A hex-encoded random token
 *
 * @example
 * ```typescript
 * import { generateToken } from '@cloudwerk/auth/password'
 *
 * const token = generateToken()
 * // 'a1b2c3d4...' (64 hex characters)
 *
 * const shortToken = generateToken(16)
 * // 'a1b2c3d4...' (32 hex characters)
 * ```
 */
export function generateToken(bytes: number = DEFAULT_TOKEN_BYTES): string {
  const buffer = new Uint8Array(bytes)
  crypto.getRandomValues(buffer)

  // Convert to hex
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Generate a cryptographically secure random token in URL-safe base64 format.
 *
 * Uses Web Crypto API for secure random number generation.
 * The output is URL-safe (uses - and _ instead of + and /, no padding).
 *
 * @param bytes - Number of random bytes (default: 32)
 * @returns A URL-safe base64-encoded random token
 *
 * @example
 * ```typescript
 * import { generateUrlSafeToken } from '@cloudwerk/auth/password'
 *
 * const token = generateUrlSafeToken()
 * // 'Yx8nK2pQ...' (43 characters for 32 bytes)
 *
 * const shortToken = generateUrlSafeToken(16)
 * // 'Yx8nK2pQ...' (22 characters for 16 bytes)
 * ```
 */
export function generateUrlSafeToken(
  bytes: number = DEFAULT_TOKEN_BYTES
): string {
  const buffer = new Uint8Array(bytes)
  crypto.getRandomValues(buffer)

  // Convert to URL-safe base64
  const base64 = btoa(String.fromCharCode(...buffer))
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
