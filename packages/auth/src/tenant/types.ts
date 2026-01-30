/**
 * @cloudwerk/auth - Multi-tenancy Types
 *
 * Type definitions for multi-tenant authentication.
 */

// ============================================================================
// Tenant Types
// ============================================================================

/**
 * Tenant information.
 */
export interface Tenant {
  /** Unique tenant identifier */
  id: string

  /** Tenant slug (used in subdomain/path) */
  slug: string

  /** Tenant display name */
  name: string

  /** Tenant configuration */
  config?: TenantConfig

  /** Tenant metadata */
  metadata?: Record<string, unknown>

  /** Whether tenant is active */
  active?: boolean

  /** When tenant was created */
  createdAt?: Date

  /** When tenant was last updated */
  updatedAt?: Date
}

/**
 * Tenant-specific configuration.
 */
export interface TenantConfig {
  /** Custom OAuth provider settings per tenant */
  oauth?: {
    github?: { clientId: string; clientSecret: string }
    google?: { clientId: string; clientSecret: string }
    [provider: string]: { clientId: string; clientSecret: string } | undefined
  }

  /** Allowed email domains for this tenant */
  allowedDomains?: string[]

  /** Session configuration overrides */
  session?: {
    maxAge?: number
    renewalThreshold?: number
  }

  /** RBAC configuration */
  rbac?: {
    defaultRole?: string
    roles?: Record<string, string[]>
  }

  /** Custom branding */
  branding?: {
    logo?: string
    primaryColor?: string
    companyName?: string
  }
}

// ============================================================================
// Resolver Types
// ============================================================================

/**
 * Tenant resolution strategy.
 */
export type TenantStrategy =
  | 'subdomain'
  | 'header'
  | 'path'
  | 'cookie'
  | 'query'
  | 'custom'

/**
 * Tenant resolver configuration.
 */
export interface TenantResolverConfig {
  /**
   * Resolution strategy.
   * @default 'subdomain'
   */
  strategy?: TenantStrategy

  /**
   * Header name for 'header' strategy.
   * @default 'X-Tenant-ID'
   */
  headerName?: string

  /**
   * Cookie name for 'cookie' strategy.
   * @default 'tenant'
   */
  cookieName?: string

  /**
   * Query parameter name for 'query' strategy.
   * @default 'tenant'
   */
  queryParam?: string

  /**
   * Path segment index for 'path' strategy (0-based).
   * @default 0
   */
  pathIndex?: number

  /**
   * Base domain for 'subdomain' strategy.
   * Used to extract subdomain from hostname.
   * @example 'myapp.com' extracts 'tenant' from 'tenant.myapp.com'
   */
  baseDomain?: string

  /**
   * Custom resolver function for 'custom' strategy.
   */
  customResolver?: (request: Request) => string | null | Promise<string | null>

  /**
   * Default tenant ID when resolution fails.
   */
  defaultTenant?: string

  /**
   * Whether to require a tenant (throw error if not found).
   * @default true
   */
  required?: boolean
}

/**
 * Tenant storage interface.
 */
export interface TenantStorage {
  /**
   * Get tenant by ID.
   *
   * @param id - Tenant ID
   * @returns Tenant or null if not found
   */
  getTenant(id: string): Promise<Tenant | null>

  /**
   * Get tenant by slug.
   *
   * @param slug - Tenant slug
   * @returns Tenant or null if not found
   */
  getTenantBySlug(slug: string): Promise<Tenant | null>

  /**
   * List all tenants.
   *
   * @param options - List options
   * @returns Array of tenants
   */
  listTenants(options?: { limit?: number; offset?: number }): Promise<Tenant[]>

  /**
   * Create a new tenant.
   *
   * @param tenant - Tenant data
   * @returns Created tenant
   */
  createTenant(tenant: Omit<Tenant, 'createdAt' | 'updatedAt'>): Promise<Tenant>

  /**
   * Update a tenant.
   *
   * @param id - Tenant ID
   * @param updates - Partial tenant data
   * @returns Updated tenant
   */
  updateTenant(id: string, updates: Partial<Tenant>): Promise<Tenant>

  /**
   * Delete a tenant.
   *
   * @param id - Tenant ID
   */
  deleteTenant(id: string): Promise<void>
}

// ============================================================================
// Context Types
// ============================================================================

/**
 * Tenant context for request.
 */
export interface TenantContext {
  /** Resolved tenant */
  tenant: Tenant

  /** Resolution strategy used */
  strategy: TenantStrategy

  /** Raw identifier that was resolved */
  identifier: string
}

/**
 * Tenant resolution error.
 */
export class TenantNotFoundError extends Error {
  constructor(
    public identifier: string,
    public strategy: TenantStrategy
  ) {
    super(`Tenant not found: ${identifier} (strategy: ${strategy})`)
    this.name = 'TenantNotFoundError'
  }
}

/**
 * Tenant required error.
 */
export class TenantRequiredError extends Error {
  constructor() {
    super('Tenant identification is required but was not provided')
    this.name = 'TenantRequiredError'
  }
}
