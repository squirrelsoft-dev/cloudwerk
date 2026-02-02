/**
 * @cloudwerk/security - Content Security Policy Middleware
 *
 * Generates and sets Content-Security-Policy headers.
 */

import type { Middleware } from '@cloudwerk/core'
import type { CSPOptions, CSPDirectives, CSPDirectiveValue } from '../types.js'

/**
 * Map of directive names to their CSP header names.
 */
const DIRECTIVE_MAP: Record<keyof CSPDirectives, string> = {
  defaultSrc: 'default-src',
  scriptSrc: 'script-src',
  styleSrc: 'style-src',
  imgSrc: 'img-src',
  fontSrc: 'font-src',
  connectSrc: 'connect-src',
  mediaSrc: 'media-src',
  objectSrc: 'object-src',
  prefetchSrc: 'prefetch-src',
  frameSrc: 'frame-src',
  workerSrc: 'worker-src',
  childSrc: 'child-src',
  frameAncestors: 'frame-ancestors',
  formAction: 'form-action',
  pluginTypes: 'plugin-types',
  baseUri: 'base-uri',
  sandbox: 'sandbox',
  requireSriFor: 'require-sri-for',
  reportUri: 'report-uri',
  reportTo: 'report-to',
  requireTrustedTypesFor: 'require-trusted-types-for',
  trustedTypes: 'trusted-types',
  upgradeInsecureRequests: 'upgrade-insecure-requests',
  blockAllMixedContent: 'block-all-mixed-content',
  manifestSrc: 'manifest-src',
  scriptSrcElem: 'script-src-elem',
  scriptSrcAttr: 'script-src-attr',
  styleSrcElem: 'style-src-elem',
  styleSrcAttr: 'style-src-attr',
}

/**
 * Generate a cryptographically secure nonce for CSP.
 *
 * @returns A base64-encoded random nonce
 */
export function generateNonce(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...bytes))
}

/**
 * Format a directive value for CSP header.
 */
function formatDirectiveValue(value: CSPDirectiveValue): string {
  if (Array.isArray(value)) {
    return value.join(' ')
  }
  return value
}

/**
 * Generate a Content-Security-Policy header string from directives.
 *
 * @param directives - CSP directives object
 * @param nonce - Optional nonce to include in script-src and style-src
 * @returns CSP header string
 *
 * @example
 * ```typescript
 * const csp = generateCSPHeader({
 *   defaultSrc: ["'self'"],
 *   scriptSrc: ["'self'", 'https://cdn.example.com'],
 *   styleSrc: ["'self'", "'unsafe-inline'"],
 * })
 * // "default-src 'self'; script-src 'self' https://cdn.example.com; style-src 'self' 'unsafe-inline'"
 * ```
 */
export function generateCSPHeader(
  directives: CSPDirectives,
  nonce?: string
): string {
  const parts: string[] = []

  for (const [key, value] of Object.entries(directives)) {
    if (value === undefined || value === false) continue

    const directiveName = DIRECTIVE_MAP[key as keyof CSPDirectives]
    if (!directiveName) continue

    // Boolean directives (no value needed)
    if (value === true) {
      parts.push(directiveName)
      continue
    }

    // Add nonce to script-src and style-src if provided
    let formattedValue = formatDirectiveValue(value as CSPDirectiveValue)
    if (nonce && (key === 'scriptSrc' || key === 'styleSrc' ||
                  key === 'scriptSrcElem' || key === 'styleSrcElem')) {
      formattedValue += ` 'nonce-${nonce}'`
    }

    parts.push(`${directiveName} ${formattedValue}`)
  }

  return parts.join('; ')
}

/**
 * Create CSP middleware.
 *
 * Generates and sets Content-Security-Policy (or Content-Security-Policy-Report-Only)
 * headers on responses.
 *
 * @param options - CSP configuration options
 * @returns Middleware function
 *
 * @example
 * ```typescript
 * import { cspMiddleware } from '@cloudwerk/security/middleware'
 *
 * export const middleware = cspMiddleware({
 *   directives: {
 *     defaultSrc: ["'self'"],
 *     scriptSrc: ["'self'", 'https://cdn.example.com'],
 *     styleSrc: ["'self'", "'unsafe-inline'"],
 *     imgSrc: ["'self'", 'data:', 'https:'],
 *   },
 * })
 * ```
 *
 * @example
 * ```typescript
 * // Report-only mode for testing
 * export const middleware = cspMiddleware({
 *   directives: {
 *     defaultSrc: ["'self'"],
 *     reportUri: '/api/csp-report',
 *   },
 *   reportOnly: true,
 * })
 * ```
 *
 * @example
 * ```typescript
 * // With nonce generation for inline scripts
 * export const middleware = cspMiddleware({
 *   directives: {
 *     defaultSrc: ["'self'"],
 *     scriptSrc: ["'self'"],
 *   },
 *   useNonce: true,
 * })
 *
 * // In your page, access the nonce via context:
 * // const nonce = context.get('cspNonce')
 * // <script nonce={nonce}>...</script>
 * ```
 */
export function cspMiddleware(options: CSPOptions = {}): Middleware {
  const {
    directives = {},
    reportOnly = false,
    useNonce = false,
    nonceContextKey = 'cspNonce',
  } = options

  const headerName = reportOnly
    ? 'Content-Security-Policy-Report-Only'
    : 'Content-Security-Policy'

  return async (request, next) => {
    // Generate nonce if requested
    let nonce: string | undefined
    if (useNonce) {
      nonce = generateNonce()
      // Note: In a real implementation, we'd use getContext().set() to store the nonce
      // For now, we'll store it in a custom header that pages can read
    }

    const response = await next()

    // Generate CSP header
    const cspValue = generateCSPHeader(directives, nonce)

    if (!cspValue) {
      return response
    }

    // Clone headers and add CSP
    const headers = new Headers(response.headers)
    headers.set(headerName, cspValue)

    // If using nonce, add it as a custom header for pages to read
    if (nonce) {
      headers.set('X-CSP-Nonce', nonce)
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    })
  }
}
