/**
 * @cloudwerk/auth - WebAuthn/Passkey Provider
 *
 * Passwordless authentication using WebAuthn passkeys.
 *
 * @example
 * ```typescript
 * import { passkey } from '@cloudwerk/auth/providers'
 *
 * const passkeyProvider = passkey({
 *   rpName: 'My App',
 *   rpId: 'myapp.com',
 *   origin: 'https://myapp.com',
 * })
 *
 * // Server-side registration
 * const registrationOptions = await generateRegistrationOptions(
 *   passkeyProvider,
 *   { id: user.id, name: user.email, displayName: user.name },
 *   existingCredentials,
 *   challengeStorage
 * )
 *
 * // Server-side authentication
 * const authOptions = await generateAuthenticationOptions(
 *   passkeyProvider,
 *   userCredentials,
 *   challengeStorage
 * )
 * ```
 */

import type { PasskeyProvider } from '../../types.js'
import type { WebAuthnConfig } from './types.js'

// Re-export types
export type {
  WebAuthnConfig,
  PublicKeyCredentialCreationOptions,
  PublicKeyCredentialRequestOptions,
  RegistrationResponse,
  AuthenticationResponse,
  VerifiedRegistration,
  VerifiedAuthentication,
  StoredCredential,
  CredentialStorage,
  ChallengeStorage,
  AuthenticatorAttachment,
  ResidentKeyRequirement,
  UserVerificationRequirement,
  AttestationConveyancePreference,
  AuthenticatorTransport,
  COSEAlgorithmIdentifier,
} from './types.js'

export { DEFAULT_SUPPORTED_ALGORITHMS } from './types.js'

// Re-export registration utilities
export {
  generateRegistrationOptions,
  verifyRegistration,
  DEFAULT_REGISTRATION_TIMEOUT,
} from './registration.js'

// Re-export authentication utilities
export {
  generateAuthenticationOptions,
  verifyAuthentication,
  DEFAULT_AUTHENTICATION_TIMEOUT,
} from './authentication.js'

// ============================================================================
// Passkey Provider Factory
// ============================================================================

/**
 * Create a passkey (WebAuthn) authentication provider.
 *
 * @param config - WebAuthn configuration
 * @returns Passkey provider
 *
 * @example
 * ```typescript
 * import { passkey } from '@cloudwerk/auth/providers'
 *
 * const passkeyProvider = passkey({
 *   rpName: 'My Application',
 *   rpId: 'myapp.com',
 *   origin: 'https://myapp.com',
 * })
 *
 * // For platform authenticators only (Face ID, Touch ID, Windows Hello)
 * const platformPasskey = passkey({
 *   rpName: 'My Application',
 *   authenticatorAttachment: 'platform',
 * })
 *
 * // For security keys
 * const securityKeyProvider = passkey({
 *   rpName: 'My Application',
 *   authenticatorAttachment: 'cross-platform',
 * })
 * ```
 *
 * @example
 * ```typescript
 * // With usernameless (discoverable credential) support
 * const discoverablePasskey = passkey({
 *   rpName: 'My Application',
 *   residentKey: 'required',
 *   userVerification: 'required',
 * })
 * ```
 */
export function passkey(config: WebAuthnConfig): PasskeyProvider {
  const id = config.id ?? 'passkey'
  const name = config.name ?? 'Passkey'

  return {
    id,
    name,
    type: 'passkey',
    rpId: config.rpId,
    rpName: config.rpName,
    origin: config.origin,
    timeout: config.timeout,
    authenticatorAttachment: config.authenticatorAttachment,
    residentKey: config.residentKey ?? 'required',
    userVerification: config.userVerification ?? 'preferred',
    attestation: config.attestation ?? 'none',
    supportedAlgorithms: config.supportedAlgorithms,
  }
}

// ============================================================================
// KV Challenge Storage
// ============================================================================

/**
 * KV namespace interface for challenge storage.
 */
export interface KVNamespaceLike {
  get(key: string): Promise<string | null>
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>
  delete(key: string): Promise<void>
}

/**
 * Create a KV-based challenge storage.
 *
 * @param kv - KV namespace binding
 * @param prefix - Key prefix
 * @returns Challenge storage implementation
 *
 * @example
 * ```typescript
 * const challengeStorage = createKVChallengeStorage(env.AUTH_KV)
 *
 * // Generate registration options
 * const options = await generateRegistrationOptions(
 *   passkeyProvider,
 *   user,
 *   credentials,
 *   challengeStorage
 * )
 *
 * // Verify registration
 * const result = await verifyRegistration(
 *   passkeyProvider,
 *   response,
 *   challengeStorage
 * )
 * ```
 */
export function createKVChallengeStorage(
  kv: KVNamespaceLike,
  prefix: string = 'auth:webauthn-challenge:'
): import('./types.js').ChallengeStorage {
  return {
    async storeChallenge(challenge, userId, ttl) {
      const value = JSON.stringify({ userId, createdAt: Date.now() })
      await kv.put(`${prefix}${challenge}`, value, {
        expirationTtl: Math.max(ttl, 1),
      })
    },

    async consumeChallenge(challenge) {
      const key = `${prefix}${challenge}`
      const value = await kv.get(key)

      if (!value) {
        return null
      }

      // Delete challenge (single-use)
      await kv.delete(key)

      try {
        const data = JSON.parse(value)
        return data.userId // undefined for authentication challenges
      } catch {
        return null
      }
    },
  }
}

// ============================================================================
// D1 Credential Storage
// ============================================================================

/**
 * D1 database interface for credential storage.
 */
export interface D1DatabaseLike {
  prepare(sql: string): D1PreparedStatementLike
  batch<T = unknown>(statements: D1PreparedStatementLike[]): Promise<D1Result<T>[]>
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
 * Create a D1-based credential storage.
 *
 * Requires a table with the following schema:
 * ```sql
 * CREATE TABLE IF NOT EXISTS webauthn_credentials (
 *   id TEXT PRIMARY KEY,
 *   user_id TEXT NOT NULL,
 *   public_key TEXT NOT NULL,
 *   counter INTEGER NOT NULL DEFAULT 0,
 *   aaguid TEXT,
 *   transports TEXT,
 *   backed_up INTEGER NOT NULL DEFAULT 0,
 *   device_type TEXT NOT NULL DEFAULT 'singleDevice',
 *   created_at TEXT NOT NULL,
 *   last_used_at TEXT,
 *   name TEXT
 * );
 *
 * CREATE INDEX idx_credentials_user_id ON webauthn_credentials(user_id);
 * ```
 *
 * @param db - D1 database binding
 * @param tableName - Table name
 * @returns Credential storage implementation
 *
 * @example
 * ```typescript
 * const credentialStorage = createD1CredentialStorage(env.DB)
 *
 * // Save credential after registration
 * await credentialStorage.createCredential({
 *   id: result.registrationInfo.credentialID,
 *   userId: user.id,
 *   publicKey: result.registrationInfo.credentialPublicKey,
 *   counter: result.registrationInfo.counter,
 *   aaguid: result.registrationInfo.aaguid,
 *   transports: result.registrationInfo.transports,
 *   backedUp: result.registrationInfo.credentialBackedUp,
 *   deviceType: result.registrationInfo.credentialDeviceType,
 *   createdAt: new Date(),
 * })
 * ```
 */
export function createD1CredentialStorage(
  db: D1DatabaseLike,
  tableName: string = 'webauthn_credentials'
): import('./types.js').CredentialStorage {
  return {
    async createCredential(credential) {
      const transports = credential.transports
        ? JSON.stringify(credential.transports)
        : null

      await db
        .prepare(
          `INSERT INTO ${tableName}
           (id, user_id, public_key, counter, aaguid, transports, backed_up, device_type, created_at, last_used_at, name)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          credential.id,
          credential.userId,
          credential.publicKey,
          credential.counter,
          credential.aaguid ?? null,
          transports,
          credential.backedUp ? 1 : 0,
          credential.deviceType,
          credential.createdAt.toISOString(),
          credential.lastUsedAt?.toISOString() ?? null,
          credential.name ?? null
        )
        .run()
    },

    async getCredential(credentialId) {
      const row = await db
        .prepare(`SELECT * FROM ${tableName} WHERE id = ?`)
        .bind(credentialId)
        .first<CredentialRow>()

      if (!row) {
        return null
      }

      return rowToCredential(row)
    },

    async getCredentialsByUser(userId) {
      const result = await db
        .prepare(`SELECT * FROM ${tableName} WHERE user_id = ?`)
        .bind(userId)
        .all<CredentialRow>()

      return (result.results ?? []).map(rowToCredential)
    },

    async updateCredential(credentialId, updates) {
      const sets: string[] = []
      const values: unknown[] = []

      if (updates.counter !== undefined) {
        sets.push('counter = ?')
        values.push(updates.counter)
      }

      if (updates.lastUsedAt !== undefined) {
        sets.push('last_used_at = ?')
        values.push(updates.lastUsedAt?.toISOString() ?? null)
      }

      if (updates.name !== undefined) {
        sets.push('name = ?')
        values.push(updates.name ?? null)
      }

      if (updates.backedUp !== undefined) {
        sets.push('backed_up = ?')
        values.push(updates.backedUp ? 1 : 0)
      }

      if (sets.length === 0) {
        return
      }

      values.push(credentialId)

      await db
        .prepare(`UPDATE ${tableName} SET ${sets.join(', ')} WHERE id = ?`)
        .bind(...values)
        .run()
    },

    async deleteCredential(credentialId) {
      await db
        .prepare(`DELETE FROM ${tableName} WHERE id = ?`)
        .bind(credentialId)
        .run()
    },
  }
}

/**
 * D1 row shape.
 */
interface CredentialRow {
  id: string
  user_id: string
  public_key: string
  counter: number
  aaguid: string | null
  transports: string | null
  backed_up: number
  device_type: string
  created_at: string
  last_used_at: string | null
  name: string | null
}

/**
 * Convert D1 row to StoredCredential.
 */
function rowToCredential(row: CredentialRow): import('./types.js').StoredCredential {
  let transports: import('./types.js').AuthenticatorTransport[] | undefined

  if (row.transports) {
    try {
      transports = JSON.parse(row.transports)
    } catch {
      transports = undefined
    }
  }

  return {
    id: row.id,
    userId: row.user_id,
    publicKey: row.public_key,
    counter: row.counter,
    aaguid: row.aaguid ?? undefined,
    transports,
    backedUp: row.backed_up === 1,
    deviceType: row.device_type as 'singleDevice' | 'multiDevice',
    createdAt: new Date(row.created_at),
    lastUsedAt: row.last_used_at ? new Date(row.last_used_at) : undefined,
    name: row.name ?? undefined,
  }
}
