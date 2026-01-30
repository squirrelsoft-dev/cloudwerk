/**
 * Utility functions for webhook signature verification.
 */

/**
 * Compute HMAC signature using Web Crypto API.
 *
 * @param algorithm - Hash algorithm ('SHA-256', 'SHA-1', etc.)
 * @param secret - Secret key as string
 * @param data - Data to sign as ArrayBuffer
 * @returns Hex-encoded signature
 */
export async function computeHmac(
  algorithm: 'SHA-256' | 'SHA-1' | 'SHA-512',
  secret: string,
  data: ArrayBuffer
): Promise<string> {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(secret)

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: algorithm },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, data)
  return arrayBufferToHex(signature)
}

/**
 * Convert ArrayBuffer to hex string.
 */
export function arrayBufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Timing-safe string comparison to prevent timing attacks.
 *
 * @param a - First string
 * @param b - Second string
 * @returns true if strings are equal
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }

  const aBytes = new TextEncoder().encode(a)
  const bBytes = new TextEncoder().encode(b)

  let result = 0
  for (let i = 0; i < aBytes.length; i++) {
    result |= aBytes[i] ^ bBytes[i]
  }

  return result === 0
}

/**
 * Parse a signature header that contains key=value pairs.
 *
 * @param header - Header value (e.g., "t=123,v1=abc")
 * @param separator - Separator between pairs (default: ',')
 * @returns Map of key-value pairs
 */
export function parseSignatureHeader(
  header: string,
  separator: string = ','
): Map<string, string> {
  const result = new Map<string, string>()

  for (const part of header.split(separator)) {
    const [key, ...valueParts] = part.trim().split('=')
    if (key && valueParts.length > 0) {
      result.set(key, valueParts.join('='))
    }
  }

  return result
}
