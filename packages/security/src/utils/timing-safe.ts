/**
 * @cloudwerk/security - Timing-Safe Utilities
 *
 * Utilities for preventing timing attacks.
 */

/**
 * Perform a timing-safe string comparison.
 *
 * This prevents timing attacks by comparing all characters regardless
 * of where differences occur.
 *
 * @param a - First string
 * @param b - Second string
 * @returns True if strings are equal
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }

  // Use XOR to compare without early exit
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }

  return result === 0
}
