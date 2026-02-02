/**
 * @cloudwerk/security - Type Definitions
 *
 * Types for security middleware configuration and options.
 */

// ============================================================================
// Cookie Types
// ============================================================================

/**
 * Cookie attributes for serialization.
 */
export interface CookieAttributes {
  /** Cookie domain */
  domain?: string
  /** Cookie path */
  path?: string
  /** Expiration date */
  expires?: Date
  /** Max age in seconds */
  maxAge?: number
  /** HTTP-only flag */
  httpOnly?: boolean
  /** Secure flag */
  secure?: boolean
  /** SameSite attribute */
  sameSite?: 'strict' | 'lax' | 'none'
}

// ============================================================================
// CSRF Types
// ============================================================================

/**
 * Options for the CSRF protection middleware.
 *
 * @example
 * ```typescript
 * import { csrfMiddleware } from '@cloudwerk/security/middleware'
 *
 * // Default configuration
 * export const middleware = csrfMiddleware()
 *
 * // Custom configuration
 * export const middleware = csrfMiddleware({
 *   excludePaths: ['/api/webhooks'],
 *   methods: ['POST', 'DELETE'],
 * })
 * ```
 */
export interface CSRFMiddlewareOptions {
  /**
   * Name of the CSRF cookie.
   * @default 'cloudwerk.csrf-token'
   */
  cookieName?: string

  /**
   * Name of the header that must contain the CSRF token.
   * @default 'X-CSRF-Token'
   */
  headerName?: string

  /**
   * Name of the form field that can contain the CSRF token.
   * Used as an alternative to the header for traditional form submissions.
   * @default 'csrf_token'
   */
  formFieldName?: string

  /**
   * HTTP methods that require CSRF validation.
   * Safe methods (GET, HEAD, OPTIONS) are always excluded.
   * @default ['POST', 'PUT', 'PATCH', 'DELETE']
   */
  methods?: string[]

  /**
   * URL path patterns to exclude from CSRF protection.
   * Useful for webhook endpoints that receive external requests.
   *
   * @example
   * ```typescript
   * excludePaths: ['/api/webhooks/stripe', '/api/webhooks/github']
   * ```
   */
  excludePaths?: string[]
}

/**
 * Options for setting the CSRF cookie.
 */
export interface SetCsrfCookieOptions {
  /**
   * Name of the CSRF cookie.
   * @default 'cloudwerk.csrf-token'
   */
  cookieName?: string

  /**
   * Cookie path.
   * @default '/'
   */
  path?: string

  /**
   * Whether the cookie is HTTP-only.
   * Must be false to allow JavaScript access for SPA frameworks.
   * @default false
   */
  httpOnly?: boolean

  /**
   * Whether the cookie requires HTTPS.
   * @default true
   */
  secure?: boolean

  /**
   * SameSite attribute.
   * @default 'lax'
   */
  sameSite?: 'strict' | 'lax' | 'none'

  /**
   * Max age in seconds.
   * @default 86400 (24 hours)
   */
  maxAge?: number
}

// ============================================================================
// Security Headers Types
// ============================================================================

/**
 * Options for the security headers middleware.
 */
export interface SecurityHeadersOptions {
  /**
   * X-Content-Type-Options header value.
   * Set to false to disable.
   * @default 'nosniff'
   */
  contentTypeOptions?: 'nosniff' | false

  /**
   * X-Frame-Options header value.
   * Set to false to disable.
   * @default 'DENY'
   */
  frameOptions?: 'DENY' | 'SAMEORIGIN' | false

  /**
   * Referrer-Policy header value.
   * Set to false to disable.
   * @default 'strict-origin-when-cross-origin'
   */
  referrerPolicy?:
    | 'no-referrer'
    | 'no-referrer-when-downgrade'
    | 'origin'
    | 'origin-when-cross-origin'
    | 'same-origin'
    | 'strict-origin'
    | 'strict-origin-when-cross-origin'
    | 'unsafe-url'
    | false

  /**
   * X-XSS-Protection header value.
   * Set to false to disable.
   * Note: This header is deprecated in modern browsers.
   * @default '0' (disabled, as modern browsers handle XSS protection)
   */
  xssProtection?: '0' | '1' | '1; mode=block' | false

  /**
   * X-Permitted-Cross-Domain-Policies header value.
   * Set to false to disable.
   * @default 'none'
   */
  permittedCrossDomainPolicies?: 'none' | 'master-only' | 'by-content-type' | 'by-ftp-filename' | 'all' | false

  /**
   * X-DNS-Prefetch-Control header value.
   * Set to false to disable.
   * @default 'off'
   */
  dnsPrefetchControl?: 'on' | 'off' | false

  /**
   * Cross-Origin-Opener-Policy header value.
   * Set to false to disable.
   */
  crossOriginOpenerPolicy?: 'same-origin' | 'same-origin-allow-popups' | 'unsafe-none' | false

  /**
   * Cross-Origin-Embedder-Policy header value.
   * Set to false to disable.
   */
  crossOriginEmbedderPolicy?: 'require-corp' | 'credentialless' | 'unsafe-none' | false

  /**
   * Cross-Origin-Resource-Policy header value.
   * Set to false to disable.
   */
  crossOriginResourcePolicy?: 'same-site' | 'same-origin' | 'cross-origin' | false
}

// ============================================================================
// CSP Types
// ============================================================================

/**
 * CSP directive values - can be strings or arrays of strings.
 */
export type CSPDirectiveValue = string | string[]

/**
 * Content Security Policy directives.
 */
export interface CSPDirectives {
  /** Fallback for other fetch directives */
  defaultSrc?: CSPDirectiveValue
  /** Valid sources for scripts */
  scriptSrc?: CSPDirectiveValue
  /** Valid sources for stylesheets */
  styleSrc?: CSPDirectiveValue
  /** Valid sources for images */
  imgSrc?: CSPDirectiveValue
  /** Valid sources for fonts */
  fontSrc?: CSPDirectiveValue
  /** Valid sources for fetch, XMLHttpRequest, WebSocket */
  connectSrc?: CSPDirectiveValue
  /** Valid sources for media (audio/video) */
  mediaSrc?: CSPDirectiveValue
  /** Valid sources for <object>, <embed>, <applet> */
  objectSrc?: CSPDirectiveValue
  /** Valid sources for prefetch, prerender */
  prefetchSrc?: CSPDirectiveValue
  /** Restricts which URLs can appear in <frame>, <iframe>, etc. */
  frameSrc?: CSPDirectiveValue
  /** Valid sources for Worker, SharedWorker, ServiceWorker */
  workerSrc?: CSPDirectiveValue
  /** Valid sources for nested browsing contexts */
  childSrc?: CSPDirectiveValue
  /** Restricts URLs that can be loaded in a frame */
  frameAncestors?: CSPDirectiveValue
  /** Restricts URLs for form submissions */
  formAction?: CSPDirectiveValue
  /** Valid MIME types for plugins */
  pluginTypes?: CSPDirectiveValue
  /** Restricts the URLs which can be used as the target of form submissions */
  baseUri?: CSPDirectiveValue
  /** Enables a sandbox for the requested resource */
  sandbox?: CSPDirectiveValue
  /** Require SRI for scripts/styles */
  requireSriFor?: CSPDirectiveValue
  /** URI to report CSP violations to */
  reportUri?: string
  /** Group name for Reporting API */
  reportTo?: string
  /** Require Trusted Types for DOM XSS sinks */
  requireTrustedTypesFor?: CSPDirectiveValue
  /** Trusted Types policy name */
  trustedTypes?: CSPDirectiveValue
  /** Upgrade insecure requests to HTTPS */
  upgradeInsecureRequests?: boolean
  /** Block all mixed content */
  blockAllMixedContent?: boolean
  /** Valid sources for manifests */
  manifestSrc?: CSPDirectiveValue
  /** Valid sources for script elements */
  scriptSrcElem?: CSPDirectiveValue
  /** Valid sources for inline script event handlers */
  scriptSrcAttr?: CSPDirectiveValue
  /** Valid sources for style elements */
  styleSrcElem?: CSPDirectiveValue
  /** Valid sources for inline style attributes */
  styleSrcAttr?: CSPDirectiveValue
}

/**
 * Options for the CSP middleware.
 */
export interface CSPOptions {
  /**
   * CSP directives to apply.
   */
  directives?: CSPDirectives

  /**
   * Whether to use Content-Security-Policy-Report-Only header instead.
   * Useful for testing CSP rules without blocking content.
   * @default false
   */
  reportOnly?: boolean

  /**
   * Generate a unique nonce for inline scripts and add it to the CSP.
   * The nonce value is stored in context for use in pages.
   * @default false
   */
  useNonce?: boolean

  /**
   * Context key to store the CSP nonce value.
   * @default 'cspNonce'
   */
  nonceContextKey?: string
}

// ============================================================================
// Origin Validation Types
// ============================================================================

/**
 * Options for origin validation middleware.
 */
export interface OriginValidationOptions {
  /**
   * Allowed origins (full URLs like 'https://example.com').
   * If not specified, origin validation is skipped.
   */
  allowedOrigins?: string[]

  /**
   * Allowed hosts (just hostnames like 'example.com').
   * Origins with these hosts are allowed regardless of protocol.
   */
  allowedHosts?: string[]

  /**
   * Allow subdomains of allowed hosts.
   * If true, 'example.com' allows 'sub.example.com'.
   * @default false
   */
  allowSubdomains?: boolean

  /**
   * HTTP methods that require origin validation.
   * @default ['POST', 'PUT', 'PATCH', 'DELETE']
   */
  methods?: string[]

  /**
   * URL paths to exclude from origin validation.
   */
  excludePaths?: string[]

  /**
   * Whether to reject requests without an Origin header for mutation methods.
   * @default true
   */
  rejectMissingOrigin?: boolean
}

// ============================================================================
// X-Requested-With Types
// ============================================================================

/**
 * Options for X-Requested-With validation middleware.
 */
export interface RequestedWithOptions {
  /**
   * Required header value.
   * @default 'XMLHttpRequest'
   */
  requiredValue?: string

  /**
   * HTTP methods that require X-Requested-With validation.
   * @default ['POST', 'PUT', 'PATCH', 'DELETE']
   */
  methods?: string[]

  /**
   * URL paths to exclude from validation.
   */
  excludePaths?: string[]
}

// ============================================================================
// Combined Security Middleware Types
// ============================================================================

/**
 * Options for the combined security middleware.
 *
 * @example
 * ```typescript
 * import { securityMiddleware } from '@cloudwerk/security/middleware'
 *
 * export const middleware = securityMiddleware({
 *   allowedOrigins: ['https://myapp.com'],
 *   csrf: {
 *     excludePaths: ['/api/webhooks/stripe'],
 *   },
 *   csp: {
 *     directives: {
 *       defaultSrc: ["'self'"],
 *       scriptSrc: ["'self'", 'https://cdn.example.com'],
 *     },
 *   },
 * })
 * ```
 */
export interface SecurityMiddlewareOptions {
  /**
   * CSRF protection options.
   * Set to false to disable CSRF protection.
   * @default enabled
   */
  csrf?: CSRFMiddlewareOptions | false

  /**
   * X-Requested-With validation options.
   * Set to false to disable.
   * @default enabled
   */
  requestedWith?: RequestedWithOptions | false

  /**
   * Security headers options.
   * Set to false to disable.
   * @default enabled
   */
  headers?: SecurityHeadersOptions | false

  /**
   * CSP options.
   * Set to false to disable.
   * @default disabled (requires app-specific config)
   */
  csp?: CSPOptions | false

  /**
   * Origin validation options.
   * Set to false to disable.
   * @default disabled (requires allowedOrigins config)
   */
  origin?: OriginValidationOptions | false

  /**
   * Shorthand for origin validation - list of allowed origins.
   * Equivalent to setting origin.allowedOrigins.
   */
  allowedOrigins?: string[]
}

// ============================================================================
// Client Types
// ============================================================================

/**
 * Options for configuring secure fetch defaults.
 */
export interface SecureFetchOptions {
  /**
   * Name of the CSRF cookie to read.
   * @default 'cloudwerk.csrf-token'
   */
  csrfCookieName?: string

  /**
   * Name of the CSRF header to send.
   * @default 'X-CSRF-Token'
   */
  csrfHeaderName?: string

  /**
   * Value for the X-Requested-With header.
   * @default 'XMLHttpRequest'
   */
  requestedWithValue?: string

  /**
   * Whether to include credentials.
   * @default 'same-origin'
   */
  credentials?: RequestCredentials

  /**
   * Base URL to prepend to relative URLs.
   */
  baseUrl?: string
}
