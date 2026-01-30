/**
 * KV-based session adapter.
 *
 * Stores sessions in Cloudflare KV with optional user index
 * for "sign out all devices" functionality.
 */

import type {
  Session,
  SessionAdapter,
  User,
  KVSessionAdapterConfig,
} from '../types.js'
import {
  DEFAULT_SESSION_PREFIX,
  USER_SESSIONS_PREFIX,
  DEFAULT_SESSION_MAX_AGE,
} from './constants.js'

/**
 * Extended session adapter interface with user session management.
 *
 * Adds methods for managing all sessions belonging to a user,
 * enabling "sign out all devices" functionality.
 */
export interface KVSessionAdapter extends SessionAdapter {
  /**
   * Delete all sessions for a user (sign out all devices).
   *
   * @param userId - The user ID
   * @returns Number of sessions deleted
   */
  deleteSessionsForUser(userId: string): Promise<number>

  /**
   * Get all active sessions for a user.
   *
   * @param userId - The user ID
   * @returns Array of session tokens
   */
  getSessionsForUser(userId: string): Promise<string[]>
}

/**
 * Minimal KV interface for type-safe operations.
 *
 * Compatible with Cloudflare's KVNamespace but doesn't require the types.
 */
interface KVNamespaceLike {
  get(key: string): Promise<string | null>
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>
  delete(key: string): Promise<void>
}

/**
 * Session data as stored in KV (dates as ISO strings).
 */
interface StoredSession {
  id: string
  userId: string
  sessionToken: string
  expiresAt: string
  createdAt: string
  updatedAt: string
  data?: Record<string, unknown>
}

/**
 * Create a KV-based session adapter.
 *
 * @param config - Adapter configuration
 * @returns Session adapter with KV-specific methods
 *
 * @example
 * ```typescript
 * import { createKVSessionAdapter } from '@cloudwerk/auth/session'
 *
 * const sessionAdapter = createKVSessionAdapter({
 *   binding: env.AUTH_SESSIONS,
 *   prefix: 'session:',
 *   enableUserIndex: true,
 * })
 *
 * // Create a session
 * const session = await sessionAdapter.createSession({
 *   userId: 'user_123',
 *   sessionToken: 'token_abc',
 *   expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
 *   createdAt: new Date(),
 *   updatedAt: new Date(),
 * })
 *
 * // Sign out all devices
 * await sessionAdapter.deleteSessionsForUser('user_123')
 * ```
 */
export function createKVSessionAdapter<TKV extends KVNamespaceLike>(
  config: KVSessionAdapterConfig<TKV>
): KVSessionAdapter {
  const {
    binding: kv,
    prefix = DEFAULT_SESSION_PREFIX,
    enableUserIndex = false,
    userAdapter,
  } = config

  const sessionKey = (token: string): string => `${prefix}${token}`
  const userSessionsKey = (userId: string): string => `${USER_SESSIONS_PREFIX}${userId}`

  /**
   * Calculate TTL in seconds from expiration date.
   */
  function getTtlSeconds(expiresAt: Date): number {
    const now = Date.now()
    const ttl = Math.floor((expiresAt.getTime() - now) / 1000)
    return Math.max(ttl, 1) // Minimum 1 second
  }

  /**
   * Serialize session for KV storage.
   */
  function serializeSession(session: Session): string {
    const stored: StoredSession = {
      id: session.id,
      userId: session.userId,
      sessionToken: session.sessionToken,
      expiresAt: session.expiresAt.toISOString(),
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
      data: session.data,
    }
    return JSON.stringify(stored)
  }

  /**
   * Deserialize session from KV storage.
   */
  function deserializeSession(data: string): Session {
    const stored: StoredSession = JSON.parse(data)
    return {
      id: stored.id,
      userId: stored.userId,
      sessionToken: stored.sessionToken,
      expiresAt: new Date(stored.expiresAt),
      createdAt: new Date(stored.createdAt),
      updatedAt: new Date(stored.updatedAt),
      data: stored.data,
    }
  }

  /**
   * Add session token to user's session index.
   */
  async function addToUserIndex(userId: string, sessionToken: string, ttl: number): Promise<void> {
    if (!enableUserIndex) return

    const key = userSessionsKey(userId)
    const existing = await kv.get(key)
    const tokens: string[] = existing ? JSON.parse(existing) : []

    if (!tokens.includes(sessionToken)) {
      tokens.push(sessionToken)
      await kv.put(key, JSON.stringify(tokens), {
        expirationTtl: Math.max(ttl, DEFAULT_SESSION_MAX_AGE),
      })
    }
  }

  /**
   * Remove session token from user's session index.
   */
  async function removeFromUserIndex(userId: string, sessionToken: string): Promise<void> {
    if (!enableUserIndex) return

    const key = userSessionsKey(userId)
    const existing = await kv.get(key)
    if (!existing) return

    const tokens: string[] = JSON.parse(existing)
    const filtered = tokens.filter(t => t !== sessionToken)

    if (filtered.length === 0) {
      await kv.delete(key)
    } else if (filtered.length !== tokens.length) {
      await kv.put(key, JSON.stringify(filtered), {
        expirationTtl: DEFAULT_SESSION_MAX_AGE,
      })
    }
  }

  return {
    async createSession(sessionData): Promise<Session> {
      const session: Session = {
        id: crypto.randomUUID(),
        ...sessionData,
      }

      const ttl = getTtlSeconds(session.expiresAt)
      await kv.put(sessionKey(session.sessionToken), serializeSession(session), {
        expirationTtl: ttl,
      })

      await addToUserIndex(session.userId, session.sessionToken, ttl)

      return session
    },

    async getSession(sessionToken): Promise<Session | null> {
      const data = await kv.get(sessionKey(sessionToken))
      if (!data) return null

      const session = deserializeSession(data)

      // Check if session is expired (KV TTL should handle this, but double-check)
      if (session.expiresAt < new Date()) {
        await this.deleteSession(sessionToken)
        return null
      }

      return session
    },

    async getSessionAndUser(sessionToken): Promise<{ session: Session; user: User } | null> {
      const session = await this.getSession(sessionToken)
      if (!session) return null

      if (!userAdapter) {
        throw new Error('userAdapter is required for getSessionAndUser')
      }

      const user = await userAdapter.getUser(session.userId)
      if (!user) return null

      return { session, user }
    },

    async updateSession(sessionToken, data): Promise<Session | null> {
      const existing = await this.getSession(sessionToken)
      if (!existing) return null

      const updated: Session = {
        ...existing,
        ...data,
        updatedAt: new Date(),
      }

      const ttl = getTtlSeconds(updated.expiresAt)
      await kv.put(sessionKey(sessionToken), serializeSession(updated), {
        expirationTtl: ttl,
      })

      return updated
    },

    async deleteSession(sessionToken): Promise<void> {
      // Get session first to know the userId for index cleanup
      if (enableUserIndex) {
        const session = await this.getSession(sessionToken)
        if (session) {
          await removeFromUserIndex(session.userId, sessionToken)
        }
      }

      await kv.delete(sessionKey(sessionToken))
    },

    async deleteSessionsForUser(userId): Promise<number> {
      if (!enableUserIndex) {
        throw new Error('deleteSessionsForUser requires enableUserIndex: true')
      }

      const tokens = await this.getSessionsForUser(userId)
      if (tokens.length === 0) return 0

      // Delete all sessions in parallel
      await Promise.all(tokens.map(token => kv.delete(sessionKey(token))))

      // Delete the user index
      await kv.delete(userSessionsKey(userId))

      return tokens.length
    },

    async getSessionsForUser(userId): Promise<string[]> {
      if (!enableUserIndex) {
        throw new Error('getSessionsForUser requires enableUserIndex: true')
      }

      const key = userSessionsKey(userId)
      const data = await kv.get(key)
      if (!data) return []

      return JSON.parse(data)
    },
  }
}
