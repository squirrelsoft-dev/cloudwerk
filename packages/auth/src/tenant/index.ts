/**
 * @cloudwerk/auth - Multi-tenancy Module
 *
 * Multi-tenant support for Cloudwerk applications.
 *
 * @example
 * ```typescript
 * import { createTenantResolver, createD1TenantStorage } from '@cloudwerk/auth/tenant'
 *
 * // Create storage
 * const storage = createD1TenantStorage(env.DB)
 *
 * // Create resolver (subdomain-based)
 * const resolver = createTenantResolver(storage, {
 *   strategy: 'subdomain',
 *   baseDomain: 'myapp.com',
 * })
 *
 * // In middleware
 * const { tenant } = await resolver.require(request)
 * ```
 */

import type { Tenant, TenantStorage } from './types.js'

// Re-export types
export type {
  Tenant,
  TenantConfig,
  TenantStrategy,
  TenantResolverConfig,
  TenantStorage,
  TenantContext,
} from './types.js'

export { TenantNotFoundError, TenantRequiredError } from './types.js'

// Re-export resolver
export {
  createTenantResolver,
  extractTenantIdentifier,
  createTenantCookie,
  clearTenantCookie,
  type TenantResolver,
} from './resolver.js'

// ============================================================================
// D1 Tenant Storage
// ============================================================================

/**
 * D1 database interface.
 */
export interface D1DatabaseLike {
  prepare(sql: string): D1PreparedStatementLike
}

export interface D1PreparedStatementLike {
  bind(...values: unknown[]): D1PreparedStatementLike
  first<T = unknown>(): Promise<T | null>
  all<T = unknown>(): Promise<D1Result<T>>
  run(): Promise<D1Result<unknown>>
}

export interface D1Result<T = unknown> {
  results?: T[]
  success: boolean
  error?: string
  meta: Record<string, unknown>
}

/**
 * Create a D1-based tenant storage.
 *
 * Requires a table with the following schema:
 * ```sql
 * CREATE TABLE IF NOT EXISTS tenants (
 *   id TEXT PRIMARY KEY,
 *   slug TEXT UNIQUE NOT NULL,
 *   name TEXT NOT NULL,
 *   config TEXT,
 *   metadata TEXT,
 *   active INTEGER NOT NULL DEFAULT 1,
 *   created_at TEXT NOT NULL,
 *   updated_at TEXT NOT NULL
 * );
 *
 * CREATE UNIQUE INDEX idx_tenants_slug ON tenants(slug);
 * ```
 *
 * @param db - D1 database binding
 * @param tableName - Table name
 * @returns Tenant storage implementation
 */
export function createD1TenantStorage(
  db: D1DatabaseLike,
  tableName: string = 'tenants'
): TenantStorage {
  return {
    async getTenant(id: string): Promise<Tenant | null> {
      const row = await db
        .prepare(`SELECT * FROM ${tableName} WHERE id = ?`)
        .bind(id)
        .first<TenantRow>()

      return row ? rowToTenant(row) : null
    },

    async getTenantBySlug(slug: string): Promise<Tenant | null> {
      const row = await db
        .prepare(`SELECT * FROM ${tableName} WHERE slug = ?`)
        .bind(slug.toLowerCase())
        .first<TenantRow>()

      return row ? rowToTenant(row) : null
    },

    async listTenants(options?: { limit?: number; offset?: number }): Promise<Tenant[]> {
      const limit = options?.limit ?? 100
      const offset = options?.offset ?? 0

      const result = await db
        .prepare(
          `SELECT * FROM ${tableName}
           WHERE active = 1
           ORDER BY name
           LIMIT ? OFFSET ?`
        )
        .bind(limit, offset)
        .all<TenantRow>()

      return (result.results ?? []).map(rowToTenant)
    },

    async createTenant(tenant: Omit<Tenant, 'createdAt' | 'updatedAt'>): Promise<Tenant> {
      const now = new Date().toISOString()

      await db
        .prepare(
          `INSERT INTO ${tableName}
           (id, slug, name, config, metadata, active, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          tenant.id,
          tenant.slug.toLowerCase(),
          tenant.name,
          tenant.config ? JSON.stringify(tenant.config) : null,
          tenant.metadata ? JSON.stringify(tenant.metadata) : null,
          tenant.active !== false ? 1 : 0,
          now,
          now
        )
        .run()

      return {
        ...tenant,
        slug: tenant.slug.toLowerCase(),
        createdAt: new Date(now),
        updatedAt: new Date(now),
      }
    },

    async updateTenant(id: string, updates: Partial<Tenant>): Promise<Tenant> {
      const now = new Date().toISOString()

      const sets: string[] = ['updated_at = ?']
      const values: unknown[] = [now]

      if (updates.slug !== undefined) {
        sets.push('slug = ?')
        values.push(updates.slug.toLowerCase())
      }

      if (updates.name !== undefined) {
        sets.push('name = ?')
        values.push(updates.name)
      }

      if (updates.config !== undefined) {
        sets.push('config = ?')
        values.push(updates.config ? JSON.stringify(updates.config) : null)
      }

      if (updates.metadata !== undefined) {
        sets.push('metadata = ?')
        values.push(updates.metadata ? JSON.stringify(updates.metadata) : null)
      }

      if (updates.active !== undefined) {
        sets.push('active = ?')
        values.push(updates.active ? 1 : 0)
      }

      values.push(id)

      await db
        .prepare(`UPDATE ${tableName} SET ${sets.join(', ')} WHERE id = ?`)
        .bind(...values)
        .run()

      const updated = await this.getTenant(id)
      if (!updated) {
        throw new Error(`Tenant not found: ${id}`)
      }

      return updated
    },

    async deleteTenant(id: string): Promise<void> {
      await db.prepare(`DELETE FROM ${tableName} WHERE id = ?`).bind(id).run()
    },
  }
}

/**
 * D1 row shape.
 */
interface TenantRow {
  id: string
  slug: string
  name: string
  config: string | null
  metadata: string | null
  active: number
  created_at: string
  updated_at: string
}

/**
 * Convert D1 row to Tenant.
 */
function rowToTenant(row: TenantRow): Tenant {
  let config: Tenant['config']
  let metadata: Tenant['metadata']

  if (row.config) {
    try {
      config = JSON.parse(row.config)
    } catch {
      config = undefined
    }
  }

  if (row.metadata) {
    try {
      metadata = JSON.parse(row.metadata)
    } catch {
      metadata = undefined
    }
  }

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    config,
    metadata,
    active: row.active === 1,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

// ============================================================================
// KV Tenant Storage
// ============================================================================

/**
 * KV namespace interface.
 */
export interface KVNamespaceLike {
  get(key: string): Promise<string | null>
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>
  delete(key: string): Promise<void>
  list(options?: { prefix?: string }): Promise<{ keys: { name: string }[] }>
}

/**
 * Create a KV-based tenant storage.
 *
 * Uses two key patterns:
 * - `tenant:id:{id}` - Tenant by ID
 * - `tenant:slug:{slug}` - Tenant ID by slug (for lookup)
 *
 * @param kv - KV namespace binding
 * @param prefix - Key prefix
 * @returns Tenant storage implementation
 *
 * @example
 * ```typescript
 * const storage = createKVTenantStorage(env.TENANT_KV)
 * ```
 */
export function createKVTenantStorage(
  kv: KVNamespaceLike,
  prefix: string = 'tenant:'
): TenantStorage {
  const idPrefix = `${prefix}id:`
  const slugPrefix = `${prefix}slug:`

  return {
    async getTenant(id: string): Promise<Tenant | null> {
      const data = await kv.get(`${idPrefix}${id}`)
      if (!data) return null

      try {
        const tenant = JSON.parse(data)
        return {
          ...tenant,
          createdAt: tenant.createdAt ? new Date(tenant.createdAt) : undefined,
          updatedAt: tenant.updatedAt ? new Date(tenant.updatedAt) : undefined,
        }
      } catch {
        return null
      }
    },

    async getTenantBySlug(slug: string): Promise<Tenant | null> {
      // Get ID from slug index
      const id = await kv.get(`${slugPrefix}${slug.toLowerCase()}`)
      if (!id) return null

      return this.getTenant(id)
    },

    async listTenants(options?: { limit?: number; offset?: number }): Promise<Tenant[]> {
      const limit = options?.limit ?? 100
      const offset = options?.offset ?? 0

      const result = await kv.list({ prefix: idPrefix })
      const keys = result.keys.slice(offset, offset + limit)

      const tenants: Tenant[] = []
      for (const key of keys) {
        const data = await kv.get(key.name)
        if (data) {
          try {
            const tenant = JSON.parse(data)
            if (tenant.active !== false) {
              tenants.push({
                ...tenant,
                createdAt: tenant.createdAt ? new Date(tenant.createdAt) : undefined,
                updatedAt: tenant.updatedAt ? new Date(tenant.updatedAt) : undefined,
              })
            }
          } catch {
            // Skip invalid entries
          }
        }
      }

      return tenants
    },

    async createTenant(tenant: Omit<Tenant, 'createdAt' | 'updatedAt'>): Promise<Tenant> {
      const now = new Date()
      const fullTenant: Tenant = {
        ...tenant,
        slug: tenant.slug.toLowerCase(),
        createdAt: now,
        updatedAt: now,
      }

      // Store tenant data
      await kv.put(`${idPrefix}${tenant.id}`, JSON.stringify(fullTenant))

      // Store slug -> ID mapping
      await kv.put(`${slugPrefix}${fullTenant.slug}`, tenant.id)

      return fullTenant
    },

    async updateTenant(id: string, updates: Partial<Tenant>): Promise<Tenant> {
      const existing = await this.getTenant(id)
      if (!existing) {
        throw new Error(`Tenant not found: ${id}`)
      }

      const now = new Date()
      const updated: Tenant = {
        ...existing,
        ...updates,
        id, // Ensure ID doesn't change
        updatedAt: now,
      }

      // If slug changed, update slug index
      if (updates.slug && updates.slug.toLowerCase() !== existing.slug) {
        // Delete old slug mapping
        await kv.delete(`${slugPrefix}${existing.slug}`)
        // Create new slug mapping
        await kv.put(`${slugPrefix}${updates.slug.toLowerCase()}`, id)
        updated.slug = updates.slug.toLowerCase()
      }

      // Store updated tenant
      await kv.put(`${idPrefix}${id}`, JSON.stringify(updated))

      return updated
    },

    async deleteTenant(id: string): Promise<void> {
      const tenant = await this.getTenant(id)
      if (tenant) {
        // Delete slug mapping
        await kv.delete(`${slugPrefix}${tenant.slug}`)
      }
      // Delete tenant data
      await kv.delete(`${idPrefix}${id}`)
    },
  }
}
