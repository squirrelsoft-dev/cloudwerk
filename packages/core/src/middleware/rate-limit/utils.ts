/**
 * @cloudwerk/core - Rate Limit Utilities
 *
 * Utility functions for rate limiting.
 */

/**
 * Get client IP from request.
 *
 * Checks headers in the following order:
 * 1. CF-Connecting-IP (Cloudflare)
 * 2. X-Forwarded-For (first IP in list)
 * 3. X-Real-IP
 *
 * @param request - Request to extract IP from
 * @returns Client IP address or 'unknown' if not found
 *
 * @example
 * ```typescript
 * const ip = getClientIP(request)
 * // '192.168.1.1'
 * ```
 */
export function getClientIP(request: Request): string {
  // Cloudflare-specific header
  const cfIP = request.headers.get('CF-Connecting-IP')
  if (cfIP) return cfIP

  // Standard proxy header
  const xForwardedFor = request.headers.get('X-Forwarded-For')
  if (xForwardedFor) {
    const ips = xForwardedFor.split(',')
    return ips[0].trim()
  }

  // X-Real-IP header
  const xRealIP = request.headers.get('X-Real-IP')
  if (xRealIP) return xRealIP

  // Fallback
  return 'unknown'
}

/**
 * Default key generator using client IP.
 *
 * @param request - Request to generate key from
 * @returns Key for rate limiting
 */
export function defaultKeyGenerator(request: Request): string {
  return getClientIP(request)
}
