/**
 * @cloudwerk/security - Security Headers Middleware
 *
 * Sets standard security headers on responses.
 */

import type { Middleware } from '@cloudwerk/core'
import type { SecurityHeadersOptions } from '../types.js'

/**
 * Default security headers configuration.
 */
const DEFAULT_OPTIONS: Required<SecurityHeadersOptions> = {
  contentTypeOptions: 'nosniff',
  frameOptions: 'DENY',
  referrerPolicy: 'strict-origin-when-cross-origin',
  xssProtection: '0', // Disabled as modern browsers handle XSS
  permittedCrossDomainPolicies: 'none',
  dnsPrefetchControl: 'off',
  crossOriginOpenerPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false,
}

/**
 * Create security headers middleware.
 *
 * Sets standard security headers on all responses:
 * - X-Content-Type-Options: nosniff
 * - X-Frame-Options: DENY
 * - Referrer-Policy: strict-origin-when-cross-origin
 * - X-XSS-Protection: 0 (disabled, modern browsers handle XSS)
 * - X-Permitted-Cross-Domain-Policies: none
 * - X-DNS-Prefetch-Control: off
 *
 * @param options - Header configuration options
 * @returns Middleware function
 *
 * @example
 * ```typescript
 * import { securityHeadersMiddleware } from '@cloudwerk/security/middleware'
 *
 * // Use defaults
 * export const middleware = securityHeadersMiddleware()
 *
 * // Custom configuration
 * export const middleware = securityHeadersMiddleware({
 *   frameOptions: 'SAMEORIGIN',
 *   crossOriginOpenerPolicy: 'same-origin',
 * })
 * ```
 */
export function securityHeadersMiddleware(
  options: SecurityHeadersOptions = {}
): Middleware {
  const config = { ...DEFAULT_OPTIONS, ...options }

  return async (request, next) => {
    const response = await next()

    // Clone headers to modify
    const headers = new Headers(response.headers)

    // X-Content-Type-Options
    if (config.contentTypeOptions !== false) {
      headers.set('X-Content-Type-Options', config.contentTypeOptions)
    }

    // X-Frame-Options
    if (config.frameOptions !== false) {
      headers.set('X-Frame-Options', config.frameOptions)
    }

    // Referrer-Policy
    if (config.referrerPolicy !== false) {
      headers.set('Referrer-Policy', config.referrerPolicy)
    }

    // X-XSS-Protection
    if (config.xssProtection !== false) {
      headers.set('X-XSS-Protection', config.xssProtection)
    }

    // X-Permitted-Cross-Domain-Policies
    if (config.permittedCrossDomainPolicies !== false) {
      headers.set('X-Permitted-Cross-Domain-Policies', config.permittedCrossDomainPolicies)
    }

    // X-DNS-Prefetch-Control
    if (config.dnsPrefetchControl !== false) {
      headers.set('X-DNS-Prefetch-Control', config.dnsPrefetchControl)
    }

    // Cross-Origin-Opener-Policy
    if (config.crossOriginOpenerPolicy !== false) {
      headers.set('Cross-Origin-Opener-Policy', config.crossOriginOpenerPolicy)
    }

    // Cross-Origin-Embedder-Policy
    if (config.crossOriginEmbedderPolicy !== false) {
      headers.set('Cross-Origin-Embedder-Policy', config.crossOriginEmbedderPolicy)
    }

    // Cross-Origin-Resource-Policy
    if (config.crossOriginResourcePolicy !== false) {
      headers.set('Cross-Origin-Resource-Policy', config.crossOriginResourcePolicy)
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    })
  }
}
