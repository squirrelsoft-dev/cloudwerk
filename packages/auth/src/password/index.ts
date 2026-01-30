/**
 * @cloudwerk/auth - Password Utilities
 *
 * Secure password hashing and token generation for Cloudwerk.
 */

// Hash utilities
export { hashPassword, verifyPassword } from './hash.js'

// Token utilities
export { generateToken, generateUrlSafeToken } from './token.js'

// Constants (for advanced use)
export {
  PBKDF2_ITERATIONS,
  PBKDF2_HASH_ALGORITHM,
  PBKDF2_KEY_LENGTH,
  SALT_LENGTH,
  DEFAULT_TOKEN_BYTES,
} from './constants.js'
