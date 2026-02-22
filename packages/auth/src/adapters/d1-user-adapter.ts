/**
 * D1-based user adapter with RBAC support.
 *
 * Stores users, accounts, and roles in Cloudflare D1 database.
 * Supports loading user roles via JOIN queries for RBAC.
 */

import type {
  User,
  Account,
  VerificationToken,
  UserAdapter,
} from '../types.js'

// ============================================================================
// Types
// ============================================================================

/**
 * Configuration for D1-based user adapter.
 *
 * @example
 * ```typescript
 * import { createD1UserAdapter } from '@cloudwerk/auth/adapters'
 *
 * const userAdapter = createD1UserAdapter({
 *   binding: env.DB,
 *   includeRoles: true,
 *   defaultRole: 'viewer',
 * })
 * ```
 */
export interface D1UserAdapterConfig {
  /** D1 database binding */
  binding: D1DatabaseLike

  /** Custom table names */
  tables?: {
    users?: string
    accounts?: string
    userRoles?: string
    verificationTokens?: string
  }

  /** Include user roles in getUser queries (requires user_roles table) */
  includeRoles?: boolean

  /** Default role to assign to new users (requires includeRoles) */
  defaultRole?: string

  /** Enable debug logging */
  debug?: boolean
}

/**
 * Minimal D1 database interface for type-safe operations.
 *
 * Compatible with Cloudflare's D1Database but doesn't require the types.
 */
interface D1DatabaseLike {
  prepare(sql: string): D1PreparedStatementLike
  batch<T = unknown>(statements: D1PreparedStatementLike[]): Promise<D1ResultLike<T>[]>
}

interface D1PreparedStatementLike {
  bind(...values: unknown[]): D1PreparedStatementLike
  first<T = unknown>(colName?: string): Promise<T | null>
  all<T = unknown>(): Promise<D1ResultLike<T>>
  run(): Promise<D1ResultLike<unknown>>
}

interface D1ResultLike<T = unknown> {
  results?: T[]
  success: boolean
  meta?: {
    changes?: number
    last_row_id?: number
  }
}

/**
 * User row from D1 database.
 */
interface UserRow {
  id: string
  email: string | null
  email_verified: string | null
  name: string | null
  image: string | null
  created_at: string
  updated_at: string
}

/**
 * User row with roles (from JOIN query).
 */
interface UserRowWithRoles extends UserRow {
  _roles: string | null
}

/**
 * Verification token row from D1 database.
 */
interface VerificationTokenRow {
  identifier: string
  token: string
  expires_at: string
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Convert a database row to a User object.
 */
function rowToUser(row: UserRow, roles?: string[]): User {
  const user: User = {
    id: row.id,
    email: row.email,
    emailVerified: row.email_verified ? new Date(row.email_verified) : null,
    name: row.name,
    image: row.image,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }

  if (roles && roles.length > 0) {
    user.data = { roles }
  }

  return user
}

/**
 * Convert a database row with roles to a User object.
 */
function rowWithRolesToUser(row: UserRowWithRoles): User {
  const roles = row._roles ? row._roles.split(',').filter(Boolean) : []
  return rowToUser(row, roles)
}

/**
 * Convert a database row to a VerificationToken object.
 */
function rowToVerificationToken(row: VerificationTokenRow): VerificationToken {
  return {
    identifier: row.identifier,
    token: row.token,
    expiresAt: new Date(row.expires_at),
  }
}

// ============================================================================
// Adapter
// ============================================================================

/**
 * Create a D1-based user adapter.
 *
 * @param config - Adapter configuration
 * @returns User adapter for D1 database
 *
 * @example
 * ```typescript
 * import { createD1UserAdapter } from '@cloudwerk/auth/adapters'
 *
 * const userAdapter = createD1UserAdapter({
 *   binding: env.DB,
 *   includeRoles: true,
 *   defaultRole: 'viewer',
 * })
 *
 * // Use in auth middleware
 * const middleware = createCoreAuthMiddleware({
 *   strategy: 'database',
 *   kvBinding: 'AUTH_SESSIONS',
 *   userAdapter,
 * })
 * ```
 */
export function createD1UserAdapter(config: D1UserAdapterConfig): UserAdapter {
  const {
    binding: db,
    tables = {},
    includeRoles = false,
    defaultRole,
    debug = false,
  } = config

  const validIdentifier = /^[a-zA-Z_][a-zA-Z0-9_]*$/
  function quoteIdentifier(name: string): string {
    if (!validIdentifier.test(name)) {
      throw new Error(`Invalid table name: ${name}`)
    }
    return `"${name}"`
  }

  const t = {
    users: quoteIdentifier(tables.users ?? 'users'),
    accounts: quoteIdentifier(tables.accounts ?? 'accounts'),
    userRoles: quoteIdentifier(tables.userRoles ?? 'user_roles'),
    verificationTokens: quoteIdentifier(tables.verificationTokens ?? 'verification_tokens'),
  }

  function log(...args: unknown[]): void {
    if (debug) {
      console.log('[D1UserAdapter]', ...args)
    }
  }

  return {
    async getUser(id: string): Promise<User | null> {
      log('getUser', id)

      if (includeRoles) {
        // JOIN with user_roles to get roles in a single query
        const row = await db
          .prepare(
            `SELECT u.*, GROUP_CONCAT(ur.role_id) as _roles
             FROM ${t.users} u
             LEFT JOIN ${t.userRoles} ur ON u.id = ur.user_id
             WHERE u.id = ?
             GROUP BY u.id`
          )
          .bind(id)
          .first<UserRowWithRoles>()

        if (!row) return null
        return rowWithRolesToUser(row)
      }

      const row = await db
        .prepare(`SELECT * FROM ${t.users} WHERE id = ?`)
        .bind(id)
        .first<UserRow>()

      if (!row) return null
      return rowToUser(row)
    },

    async getUserByEmail(email: string): Promise<User | null> {
      log('getUserByEmail', email)

      if (includeRoles) {
        const row = await db
          .prepare(
            `SELECT u.*, GROUP_CONCAT(ur.role_id) as _roles
             FROM ${t.users} u
             LEFT JOIN ${t.userRoles} ur ON u.id = ur.user_id
             WHERE u.email = ?
             GROUP BY u.id`
          )
          .bind(email)
          .first<UserRowWithRoles>()

        if (!row) return null
        return rowWithRolesToUser(row)
      }

      const row = await db
        .prepare(`SELECT * FROM ${t.users} WHERE email = ?`)
        .bind(email)
        .first<UserRow>()

      if (!row) return null
      return rowToUser(row)
    },

    async getUserByAccount(
      provider: string,
      providerAccountId: string
    ): Promise<User | null> {
      log('getUserByAccount', provider, providerAccountId)

      if (includeRoles) {
        const row = await db
          .prepare(
            `SELECT u.*, GROUP_CONCAT(ur.role_id) as _roles
             FROM ${t.users} u
             INNER JOIN ${t.accounts} a ON u.id = a.user_id
             LEFT JOIN ${t.userRoles} ur ON u.id = ur.user_id
             WHERE a.provider = ? AND a.provider_account_id = ?
             GROUP BY u.id`
          )
          .bind(provider, providerAccountId)
          .first<UserRowWithRoles>()

        if (!row) return null
        return rowWithRolesToUser(row)
      }

      const row = await db
        .prepare(
          `SELECT u.* FROM ${t.users} u
           INNER JOIN ${t.accounts} a ON u.id = a.user_id
           WHERE a.provider = ? AND a.provider_account_id = ?`
        )
        .bind(provider, providerAccountId)
        .first<UserRow>()

      if (!row) return null
      return rowToUser(row)
    },

    async createUser(
      user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>
    ): Promise<User> {
      log('createUser', user.email)

      const id = crypto.randomUUID()
      const now = new Date().toISOString()

      const statements: D1PreparedStatementLike[] = [
        db
          .prepare(
            `INSERT INTO ${t.users} (id, email, email_verified, name, image, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(
            id,
            user.email,
            user.emailVerified?.toISOString() ?? null,
            user.name ?? null,
            user.image ?? null,
            now,
            now
          ),
      ]

      // Assign default role if configured
      if (includeRoles && defaultRole) {
        statements.push(
          db
            .prepare(
              `INSERT INTO ${t.userRoles} (user_id, role_id) VALUES (?, ?)`
            )
            .bind(id, defaultRole)
        )
      }

      await db.batch(statements)

      const createdUser: User = {
        id,
        email: user.email,
        emailVerified: user.emailVerified,
        name: user.name,
        image: user.image,
        createdAt: new Date(now),
        updatedAt: new Date(now),
      }

      if (includeRoles && defaultRole) {
        createdUser.data = { roles: [defaultRole] }
      }

      return createdUser
    },

    async updateUser(id: string, data: Partial<User>): Promise<User> {
      log('updateUser', id, data)

      const now = new Date().toISOString()
      const updates: string[] = ['updated_at = ?']
      const values: unknown[] = [now]

      if (data.email !== undefined) {
        updates.push('email = ?')
        values.push(data.email)
      }
      if (data.emailVerified !== undefined) {
        updates.push('email_verified = ?')
        values.push(data.emailVerified?.toISOString() ?? null)
      }
      if (data.name !== undefined) {
        updates.push('name = ?')
        values.push(data.name)
      }
      if (data.image !== undefined) {
        updates.push('image = ?')
        values.push(data.image)
      }

      values.push(id)

      const statements: D1PreparedStatementLike[] = [
        db
          .prepare(
            `UPDATE ${t.users} SET ${updates.join(', ')} WHERE id = ?`
          )
          .bind(...values),
      ]

      // Handle role updates if provided
      const newRoles = data.data?.roles as string[] | undefined
      if (includeRoles && newRoles !== undefined) {
        // Delete existing roles
        statements.push(
          db
            .prepare(`DELETE FROM ${t.userRoles} WHERE user_id = ?`)
            .bind(id)
        )

        // Insert new roles
        for (const role of newRoles) {
          statements.push(
            db
              .prepare(
                `INSERT INTO ${t.userRoles} (user_id, role_id) VALUES (?, ?)`
              )
              .bind(id, role)
          )
        }
      }

      await db.batch(statements)

      // Fetch and return updated user
      const user = await this.getUser(id)
      if (!user) {
        throw new Error(`User not found after update: ${id}`)
      }
      return user
    },

    async deleteUser(id: string): Promise<void> {
      log('deleteUser', id)

      // Foreign key CASCADE should handle related records
      await db
        .prepare(`DELETE FROM ${t.users} WHERE id = ?`)
        .bind(id)
        .run()
    },

    async linkAccount(account: Omit<Account, 'id'>): Promise<Account> {
      log('linkAccount', account.provider, account.providerAccountId)

      const id = crypto.randomUUID()

      await db
        .prepare(
          `INSERT INTO ${t.accounts} (id, user_id, type, provider, provider_account_id, refresh_token, access_token, expires_at, token_type, scope, id_token)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          id,
          account.userId,
          account.type,
          account.provider,
          account.providerAccountId,
          account.refreshToken ?? null,
          account.accessToken ?? null,
          account.expiresAt ?? null,
          account.tokenType ?? null,
          account.scope ?? null,
          account.idToken ?? null
        )
        .run()

      return { id, ...account }
    },

    async unlinkAccount(
      provider: string,
      providerAccountId: string
    ): Promise<void> {
      log('unlinkAccount', provider, providerAccountId)

      await db
        .prepare(
          `DELETE FROM ${t.accounts} WHERE provider = ? AND provider_account_id = ?`
        )
        .bind(provider, providerAccountId)
        .run()
    },

    async createVerificationToken(
      token: VerificationToken
    ): Promise<VerificationToken> {
      log('createVerificationToken', token.identifier)

      await db
        .prepare(
          `INSERT INTO ${t.verificationTokens} (identifier, token, expires_at)
           VALUES (?, ?, ?)`
        )
        .bind(token.identifier, token.token, token.expiresAt.toISOString())
        .run()

      return token
    },

    async useVerificationToken(
      identifier: string,
      token: string
    ): Promise<VerificationToken | null> {
      log('useVerificationToken', identifier)

      const row = await db
        .prepare(
          `SELECT * FROM ${t.verificationTokens} WHERE identifier = ? AND token = ?`
        )
        .bind(identifier, token)
        .first<VerificationTokenRow>()

      if (!row) return null

      // Delete the token after use
      await db
        .prepare(
          `DELETE FROM ${t.verificationTokens} WHERE identifier = ? AND token = ?`
        )
        .bind(identifier, token)
        .run()

      return rowToVerificationToken(row)
    },
  }
}
