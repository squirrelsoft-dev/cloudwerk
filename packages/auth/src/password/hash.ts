/**
 * @cloudwerk/auth - Password Hashing Utilities
 *
 * Provides secure password hashing using PBKDF2 with Web Crypto API.
 * Compatible with Cloudflare Workers.
 */

import {
  PBKDF2_ITERATIONS,
  PBKDF2_HASH_ALGORITHM,
  PBKDF2_KEY_LENGTH,
  SALT_LENGTH,
} from './constants.js'

// ============================================================================
// Internal Utilities
// ============================================================================

/**
 * Perform a timing-safe comparison of two byte arrays.
 *
 * This prevents timing attacks by comparing all bytes regardless
 * of where differences occur.
 *
 * @param a - First byte array
 * @param b - Second byte array
 * @returns True if arrays are equal
 */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false
  }

  // Use XOR to compare without early exit
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i]
  }

  return result === 0
}

/**
 * Encode bytes to base64.
 */
function bytesToBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
}

/**
 * Decode base64 to bytes.
 */
function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

// ============================================================================
// Password Hashing
// ============================================================================

/**
 * Hash a password using PBKDF2.
 *
 * Uses Web Crypto API with secure parameters:
 * - 100,000 iterations
 * - SHA-256 hash algorithm
 * - 256-bit derived key
 * - 128-bit random salt
 *
 * The salt is prepended to the hash before base64 encoding.
 *
 * @param password - The plaintext password to hash
 * @returns A base64-encoded string containing salt + hash
 *
 * @example
 * ```typescript
 * import { hashPassword } from '@cloudwerk/auth'
 *
 * const hash = await hashPassword('mypassword')
 * // Store hash in database
 * ```
 */
export async function hashPassword(password: string): Promise<string> {
  // Generate random salt
  const salt = new Uint8Array(SALT_LENGTH)
  crypto.getRandomValues(salt)

  // Import password as key material
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )

  // Derive key using PBKDF2
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: PBKDF2_HASH_ALGORITHM,
    },
    keyMaterial,
    PBKDF2_KEY_LENGTH
  )

  const hash = new Uint8Array(derivedBits)

  // Combine salt + hash
  const combined = new Uint8Array(salt.length + hash.length)
  combined.set(salt)
  combined.set(hash, salt.length)

  return bytesToBase64(combined)
}

/**
 * Verify a password against a stored hash.
 *
 * Extracts the salt from the stored hash, re-hashes the password
 * with that salt, and compares using constant-time comparison.
 *
 * @param password - The plaintext password to verify
 * @param storedHash - The base64-encoded hash from hashPassword()
 * @returns True if password matches, false otherwise
 *
 * @example
 * ```typescript
 * import { hashPassword, verifyPassword } from '@cloudwerk/auth'
 *
 * const hash = await hashPassword('mypassword')
 * const valid = await verifyPassword('mypassword', hash)
 * // valid === true
 *
 * const invalid = await verifyPassword('wrongpassword', hash)
 * // invalid === false
 * ```
 */
export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  try {
    // Decode stored hash
    const combined = base64ToBytes(storedHash)

    // Extract salt and hash
    const expectedKeyBytes = PBKDF2_KEY_LENGTH / 8
    if (combined.length !== SALT_LENGTH + expectedKeyBytes) {
      return false
    }

    const salt = combined.slice(0, SALT_LENGTH)
    const expectedHash = combined.slice(SALT_LENGTH)

    // Import password as key material
    const encoder = new TextEncoder()
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    )

    // Derive key using PBKDF2 with extracted salt
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt,
        iterations: PBKDF2_ITERATIONS,
        hash: PBKDF2_HASH_ALGORITHM,
      },
      keyMaterial,
      PBKDF2_KEY_LENGTH
    )

    const actualHash = new Uint8Array(derivedBits)

    // Constant-time comparison
    return timingSafeEqual(actualHash, expectedHash)
  } catch {
    // Invalid base64 or other errors
    return false
  }
}
