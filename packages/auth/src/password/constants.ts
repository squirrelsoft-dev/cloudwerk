/**
 * @cloudwerk/auth - Password Hashing Constants
 *
 * PBKDF2 configuration constants for secure password hashing.
 * These values are fixed to prevent weakening of security parameters.
 */

/** Number of PBKDF2 iterations (100,000 recommended by OWASP) */
export const PBKDF2_ITERATIONS = 100_000

/** Hash algorithm for PBKDF2 */
export const PBKDF2_HASH_ALGORITHM = 'SHA-256'

/** Derived key length in bits */
export const PBKDF2_KEY_LENGTH = 256

/** Salt length in bytes (128 bits) */
export const SALT_LENGTH = 16

/** Default token size in bytes (256 bits) */
export const DEFAULT_TOKEN_BYTES = 32
