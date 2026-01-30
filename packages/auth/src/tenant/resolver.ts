/**
 * @cloudwerk/auth - Tenant Resolver
 *
 * Tenant detection strategies for multi-tenant applications.
 */

import type {
  TenantResolverConfig,
  Tenant,
  TenantStorage,
  TenantContext,
} from './types.js'
import { TenantNotFoundError, TenantRequiredError } from './types.js'

// ============================================================================
// Identifier Extraction
// ============================================================================

/**
 * Extract tenant identifier from request using the specified strategy.
 *
 * @param request - HTTP request
 * @param config - Resolver configuration
 * @returns Tenant identifier or null
 */
export async function extractTenantIdentifier(
  request: Request,
  config: TenantResolverConfig
): Promise<string | null> {
  const strategy = config.strategy ?? 'subdomain'

  switch (strategy) {
    case 'subdomain':
      return extractFromSubdomain(request, config)

    case 'header':
      return extractFromHeader(request, config)

    case 'path':
      return extractFromPath(request, config)

    case 'cookie':
      return extractFromCookie(request, config)

    case 'query':
      return extractFromQuery(request, config)

    case 'custom':
      if (!config.customResolver) {
        throw new Error('Custom resolver function required for custom strategy')
      }
      return config.customResolver(request)

    default:
      throw new Error(`Unknown tenant strategy: ${strategy}`)
  }
}

/**
 * Extract tenant from subdomain.
 */
function extractFromSubdomain(
  request: Request,
  config: TenantResolverConfig
): string | null {
  const url = new URL(request.url)
  const hostname = url.hostname

  // Get base domain
  const baseDomain = config.baseDomain
  if (!baseDomain) {
    // Try to auto-detect: assume last two parts are the base domain
    const parts = hostname.split('.')
    if (parts.length <= 2) {
      return null // No subdomain
    }
    // Everything except the last two parts
    return parts.slice(0, -2).join('.')
  }

  // Remove base domain from hostname
  if (!hostname.endsWith(baseDomain)) {
    return null
  }

  const subdomain = hostname.slice(0, -baseDomain.length - 1) // -1 for the dot
  return subdomain || null
}

/**
 * Extract tenant from header.
 */
function extractFromHeader(
  request: Request,
  config: TenantResolverConfig
): string | null {
  const headerName = config.headerName ?? 'X-Tenant-ID'
  return request.headers.get(headerName)
}

/**
 * Extract tenant from URL path.
 */
function extractFromPath(request: Request, config: TenantResolverConfig): string | null {
  const url = new URL(request.url)
  const pathIndex = config.pathIndex ?? 0

  // Split path and filter empty segments
  const segments = url.pathname.split('/').filter(Boolean)

  if (pathIndex >= segments.length) {
    return null
  }

  return segments[pathIndex]
}

/**
 * Extract tenant from cookie.
 */
function extractFromCookie(
  request: Request,
  config: TenantResolverConfig
): string | null {
  const cookieName = config.cookieName ?? 'tenant'
  const cookieHeader = request.headers.get('Cookie')

  if (!cookieHeader) {
    return null
  }

  // Parse cookies
  const cookies = cookieHeader.split(';').reduce(
    (acc, cookie) => {
      const [name, value] = cookie.trim().split('=')
      if (name && value !== undefined) {
        acc[name] = decodeURIComponent(value)
      }
      return acc
    },
    {} as Record<string, string>
  )

  return cookies[cookieName] ?? null
}

/**
 * Extract tenant from query parameter.
 */
function extractFromQuery(
  request: Request,
  config: TenantResolverConfig
): string | null {
  const url = new URL(request.url)
  const queryParam = config.queryParam ?? 'tenant'
  return url.searchParams.get(queryParam)
}

// ============================================================================
// Tenant Resolver
// ============================================================================

/**
 * Tenant resolver interface.
 */
export interface TenantResolver {
  /**
   * Resolve tenant from request.
   *
   * @param request - HTTP request
   * @returns Tenant context or null
   * @throws TenantNotFoundError if tenant not found and required
   * @throws TenantRequiredError if no identifier and required
   */
  resolve(request: Request): Promise<TenantContext | null>

  /**
   * Resolve tenant and throw if not found.
   *
   * @param request - HTTP request
   * @returns Tenant context
   * @throws TenantNotFoundError if tenant not found
   * @throws TenantRequiredError if no identifier
   */
  require(request: Request): Promise<TenantContext>

  /**
   * Get tenant by ID.
   *
   * @param id - Tenant ID
   * @returns Tenant or null
   */
  getTenant(id: string): Promise<Tenant | null>

  /**
   * Get tenant by slug.
   *
   * @param slug - Tenant slug
   * @returns Tenant or null
   */
  getTenantBySlug(slug: string): Promise<Tenant | null>
}

/**
 * Create a tenant resolver.
 *
 * @param storage - Tenant storage
 * @param config - Resolver configuration
 * @returns Tenant resolver
 *
 * @example
 * ```typescript
 * // Subdomain-based resolution
 * const resolver = createTenantResolver(storage, {
 *   strategy: 'subdomain',
 *   baseDomain: 'myapp.com',
 * })
 *
 * // Header-based resolution
 * const resolver = createTenantResolver(storage, {
 *   strategy: 'header',
 *   headerName: 'X-Tenant-ID',
 * })
 *
 * // Path-based resolution
 * const resolver = createTenantResolver(storage, {
 *   strategy: 'path',
 *   pathIndex: 0, // /tenant-slug/rest/of/path
 * })
 * ```
 */
export function createTenantResolver(
  storage: TenantStorage,
  config: TenantResolverConfig = {}
): TenantResolver {
  const strategy = config.strategy ?? 'subdomain'
  const required = config.required ?? true

  return {
    async resolve(request: Request): Promise<TenantContext | null> {
      // Extract identifier
      let identifier = await extractTenantIdentifier(request, config)

      // Use default if not found
      if (!identifier && config.defaultTenant) {
        identifier = config.defaultTenant
      }

      // No identifier found
      if (!identifier) {
        if (required) {
          throw new TenantRequiredError()
        }
        return null
      }

      // Look up tenant
      // Try by slug first, then by ID
      let tenant = await storage.getTenantBySlug(identifier)
      if (!tenant) {
        tenant = await storage.getTenant(identifier)
      }

      if (!tenant) {
        if (required) {
          throw new TenantNotFoundError(identifier, strategy)
        }
        return null
      }

      // Check if tenant is active
      if (tenant.active === false) {
        if (required) {
          throw new TenantNotFoundError(identifier, strategy)
        }
        return null
      }

      return {
        tenant,
        strategy,
        identifier,
      }
    },

    async require(request: Request): Promise<TenantContext> {
      const context = await this.resolve(request)
      if (!context) {
        throw new TenantRequiredError()
      }
      return context
    },

    async getTenant(id: string): Promise<Tenant | null> {
      return storage.getTenant(id)
    },

    async getTenantBySlug(slug: string): Promise<Tenant | null> {
      return storage.getTenantBySlug(slug)
    },
  }
}

// ============================================================================
// Middleware Helper
// ============================================================================

/**
 * Create tenant cookie for response.
 *
 * @param tenant - Tenant to set
 * @param options - Cookie options
 * @returns Set-Cookie header value
 */
export function createTenantCookie(
  tenant: Tenant,
  options: {
    name?: string
    path?: string
    maxAge?: number
    secure?: boolean
    sameSite?: 'Strict' | 'Lax' | 'None'
  } = {}
): string {
  const {
    name = 'tenant',
    path = '/',
    maxAge = 60 * 60 * 24 * 365, // 1 year
    secure = true,
    sameSite = 'Lax',
  } = options

  const parts = [
    `${name}=${encodeURIComponent(tenant.slug)}`,
    `Path=${path}`,
    `Max-Age=${maxAge}`,
    `SameSite=${sameSite}`,
  ]

  if (secure) {
    parts.push('Secure')
  }

  return parts.join('; ')
}

/**
 * Clear tenant cookie.
 *
 * @param options - Cookie options
 * @returns Set-Cookie header value
 */
export function clearTenantCookie(
  options: { name?: string; path?: string } = {}
): string {
  const { name = 'tenant', path = '/' } = options
  return `${name}=; Path=${path}; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
}
