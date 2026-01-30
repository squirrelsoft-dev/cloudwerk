/**
 * @cloudwerk/auth - OIDC Discovery
 *
 * OpenID Connect Discovery (RFC 8414) for fetching provider configuration.
 */

import type { OIDCDiscoveryDocument } from './types.js'

/**
 * Cache for OIDC discovery documents.
 *
 * In-memory cache with TTL to avoid repeated fetches.
 */
const discoveryCache = new Map<
  string,
  { document: OIDCDiscoveryDocument; expiresAt: number }
>()

/**
 * Default cache TTL in milliseconds (1 hour).
 */
const DEFAULT_CACHE_TTL = 60 * 60 * 1000

/**
 * Discover OIDC configuration from a well-known URL.
 *
 * @param wellKnownUrl - The .well-known/openid-configuration URL
 * @param options - Discovery options
 * @returns OIDC discovery document
 *
 * @example
 * ```typescript
 * const config = await discoverOIDC(
 *   'https://accounts.google.com/.well-known/openid-configuration'
 * )
 *
 * console.log(config.authorization_endpoint)
 * // => 'https://accounts.google.com/o/oauth2/v2/auth'
 * ```
 */
export async function discoverOIDC(
  wellKnownUrl: string,
  options?: {
    /**
     * Whether to use cached configuration.
     * @default true
     */
    useCache?: boolean

    /**
     * Cache TTL in milliseconds.
     * @default 3600000 (1 hour)
     */
    cacheTtl?: number

    /**
     * Custom headers for the request.
     */
    headers?: Record<string, string>
  }
): Promise<OIDCDiscoveryDocument> {
  const useCache = options?.useCache ?? true
  const cacheTtl = options?.cacheTtl ?? DEFAULT_CACHE_TTL

  // Check cache
  if (useCache) {
    const cached = discoveryCache.get(wellKnownUrl)
    if (cached && cached.expiresAt > Date.now()) {
      return cached.document
    }
  }

  // Fetch discovery document
  const response = await fetch(wellKnownUrl, {
    headers: {
      Accept: 'application/json',
      ...options?.headers,
    },
  })

  if (!response.ok) {
    throw new OIDCDiscoveryError(
      `Failed to fetch OIDC configuration: ${response.status} ${response.statusText}`,
      wellKnownUrl
    )
  }

  const document = (await response.json()) as OIDCDiscoveryDocument

  // Validate required fields
  validateDiscoveryDocument(document, wellKnownUrl)

  // Cache the document
  if (useCache) {
    discoveryCache.set(wellKnownUrl, {
      document,
      expiresAt: Date.now() + cacheTtl,
    })
  }

  return document
}

/**
 * Construct well-known URL from issuer.
 *
 * @param issuer - The OIDC issuer URL
 * @returns Well-known configuration URL
 *
 * @example
 * ```typescript
 * const url = getWellKnownUrl('https://accounts.google.com')
 * // => 'https://accounts.google.com/.well-known/openid-configuration'
 * ```
 */
export function getWellKnownUrl(issuer: string): string {
  const url = new URL(issuer)

  // Remove trailing slash
  let path = url.pathname
  if (path.endsWith('/')) {
    path = path.slice(0, -1)
  }

  url.pathname = `${path}/.well-known/openid-configuration`
  return url.toString()
}

/**
 * Clear the discovery cache.
 *
 * Useful for testing or when forcing a refresh of configuration.
 *
 * @param wellKnownUrl - Optional URL to clear. If not provided, clears all.
 */
export function clearDiscoveryCache(wellKnownUrl?: string): void {
  if (wellKnownUrl) {
    discoveryCache.delete(wellKnownUrl)
  } else {
    discoveryCache.clear()
  }
}

/**
 * Validate a discovery document has required fields.
 *
 * @param document - The document to validate
 * @param url - The URL it was fetched from (for error messages)
 */
function validateDiscoveryDocument(
  document: OIDCDiscoveryDocument,
  url: string
): void {
  const required: (keyof OIDCDiscoveryDocument)[] = [
    'issuer',
    'authorization_endpoint',
    'token_endpoint',
    'response_types_supported',
  ]

  for (const field of required) {
    if (!document[field]) {
      throw new OIDCDiscoveryError(
        `OIDC discovery document missing required field: ${field}`,
        url
      )
    }
  }

  // Validate issuer matches
  const documentIssuer = new URL(document.issuer)
  const fetchedFrom = new URL(url)

  // The issuer in the document should match the base URL we fetched from
  if (documentIssuer.origin !== fetchedFrom.origin) {
    throw new OIDCDiscoveryError(
      `OIDC issuer mismatch: document says ${document.issuer}, fetched from ${fetchedFrom.origin}`,
      url
    )
  }
}

// ============================================================================
// Common OIDC Provider URLs
// ============================================================================

/**
 * Well-known OIDC configuration URLs for common providers.
 */
export const WELL_KNOWN_PROVIDERS = {
  google: 'https://accounts.google.com/.well-known/openid-configuration',
  microsoft:
    'https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration',
  apple: 'https://appleid.apple.com/.well-known/openid-configuration',
  auth0: (domain: string) =>
    `https://${domain}/.well-known/openid-configuration`,
  okta: (domain: string) =>
    `https://${domain}/.well-known/openid-configuration`,
  keycloak: (baseUrl: string, realm: string) =>
    `${baseUrl}/realms/${realm}/.well-known/openid-configuration`,
} as const

// ============================================================================
// Error Types
// ============================================================================

/**
 * Error thrown during OIDC discovery.
 */
export class OIDCDiscoveryError extends Error {
  /** The URL that was being fetched */
  readonly url: string

  constructor(message: string, url: string) {
    super(message)
    this.name = 'OIDCDiscoveryError'
    this.url = url
  }
}

// ============================================================================
// JWKS Utilities
// ============================================================================

/**
 * JSON Web Key from JWKS.
 */
export interface JWK {
  /** Key type (RSA, EC) */
  kty: string
  /** Key ID */
  kid?: string
  /** Algorithm */
  alg?: string
  /** Key use (sig, enc) */
  use?: string
  /** Key operations */
  key_ops?: string[]
  /** RSA modulus */
  n?: string
  /** RSA exponent */
  e?: string
  /** EC curve */
  crv?: string
  /** EC x coordinate */
  x?: string
  /** EC y coordinate */
  y?: string
}

/**
 * JSON Web Key Set.
 */
export interface JWKS {
  keys: JWK[]
}

/**
 * Cache for JWKS.
 */
const jwksCache = new Map<string, { jwks: JWKS; expiresAt: number }>()

/**
 * Fetch JWKS from a provider.
 *
 * @param jwksUri - The JWKS URI from discovery document
 * @param options - Fetch options
 * @returns JSON Web Key Set
 *
 * @example
 * ```typescript
 * const discovery = await discoverOIDC(wellKnownUrl)
 * const jwks = await fetchJWKS(discovery.jwks_uri!)
 *
 * // Find key for ID token validation
 * const key = jwks.keys.find(k => k.kid === idTokenKid)
 * ```
 */
export async function fetchJWKS(
  jwksUri: string,
  options?: {
    useCache?: boolean
    cacheTtl?: number
  }
): Promise<JWKS> {
  const useCache = options?.useCache ?? true
  const cacheTtl = options?.cacheTtl ?? DEFAULT_CACHE_TTL

  // Check cache
  if (useCache) {
    const cached = jwksCache.get(jwksUri)
    if (cached && cached.expiresAt > Date.now()) {
      return cached.jwks
    }
  }

  const response = await fetch(jwksUri, {
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(
      `Failed to fetch JWKS: ${response.status} ${response.statusText}`
    )
  }

  const jwks = (await response.json()) as JWKS

  // Cache
  if (useCache) {
    jwksCache.set(jwksUri, {
      jwks,
      expiresAt: Date.now() + cacheTtl,
    })
  }

  return jwks
}

/**
 * Clear the JWKS cache.
 *
 * @param jwksUri - Optional URI to clear. If not provided, clears all.
 */
export function clearJWKSCache(jwksUri?: string): void {
  if (jwksUri) {
    jwksCache.delete(jwksUri)
  } else {
    jwksCache.clear()
  }
}

/**
 * Find a JWK by key ID.
 *
 * @param jwks - The JWKS to search
 * @param kid - The key ID to find
 * @returns The matching JWK or undefined
 */
export function findJWKByKid(jwks: JWKS, kid: string): JWK | undefined {
  return jwks.keys.find((key) => key.kid === kid)
}
