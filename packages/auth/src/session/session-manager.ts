/**
 * Session manager for high-level session orchestration.
 *
 * Provides a convenient API for session operations with automatic
 * session refresh and configurable behavior.
 */

import type { Session, SessionAdapter, Awaitable } from '../types.js'
import {
  DEFAULT_SESSION_MAX_AGE,
  DEFAULT_SESSION_UPDATE_AGE,
} from './constants.js'

/**
 * Configuration for session manager.
 */
export interface SessionManagerConfig {
  /** Session adapter for storage operations */
  adapter: SessionAdapter

  /** Maximum session age in seconds (default: 30 days) */
  maxAge?: number

  /** How often to refresh session in seconds (default: 24 hours) */
  updateAge?: number

  /** Custom session token generator */
  generateSessionToken?: () => string
}

/**
 * Session manager for orchestrating session operations.
 */
export interface SessionManager {
  /**
   * Get a session by token.
   * Automatically refreshes the session if updateAge has passed.
   *
   * @param token - Session token
   * @returns Session or null if not found/expired
   */
  getSession(token: string): Awaitable<Session | null>

  /**
   * Create a new session for a user.
   *
   * @param userId - User ID
   * @param data - Optional session data
   * @returns Created session
   */
  createSession(
    userId: string,
    data?: Record<string, unknown>
  ): Awaitable<Session>

  /**
   * Invalidate (delete) a session.
   *
   * @param token - Session token
   */
  invalidateSession(token: string): Awaitable<void>

  /**
   * Check if a session should be refreshed.
   *
   * @param session - Session to check
   * @returns True if session should be refreshed
   */
  shouldRefresh(session: Session): boolean

  /**
   * Refresh a session by extending its expiration.
   *
   * @param session - Session to refresh
   * @returns Updated session
   */
  refreshSession(session: Session): Awaitable<Session | null>
}

/**
 * Generate a secure random session token.
 */
function generateSecureToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  // Convert to URL-safe base64
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

/**
 * Create a session manager.
 *
 * @param config - Manager configuration
 * @returns Session manager instance
 *
 * @example
 * ```typescript
 * import { createSessionManager, createKVSessionAdapter } from '@cloudwerk/auth/session'
 *
 * const adapter = createKVSessionAdapter({ binding: env.SESSIONS })
 * const manager = createSessionManager({
 *   adapter,
 *   maxAge: 7 * 24 * 60 * 60, // 7 days
 *   updateAge: 12 * 60 * 60,  // 12 hours
 * })
 *
 * // Create a session
 * const session = await manager.createSession('user_123', { role: 'admin' })
 *
 * // Get and auto-refresh session
 * const current = await manager.getSession(session.sessionToken)
 *
 * // Sign out
 * await manager.invalidateSession(session.sessionToken)
 * ```
 */
export function createSessionManager(config: SessionManagerConfig): SessionManager {
  const {
    adapter,
    maxAge = DEFAULT_SESSION_MAX_AGE,
    updateAge = DEFAULT_SESSION_UPDATE_AGE,
    generateSessionToken = generateSecureToken,
  } = config

  return {
    async getSession(token: string): Promise<Session | null> {
      const session = await adapter.getSession(token)
      if (!session) return null

      // Check if session is expired
      if (session.expiresAt < new Date()) {
        await adapter.deleteSession(token)
        return null
      }

      // Auto-refresh if needed
      if (this.shouldRefresh(session)) {
        const refreshed = await this.refreshSession(session)
        return refreshed ?? session
      }

      return session
    },

    async createSession(
      userId: string,
      data?: Record<string, unknown>
    ): Promise<Session> {
      const now = new Date()
      const expiresAt = new Date(now.getTime() + maxAge * 1000)

      return adapter.createSession({
        userId,
        sessionToken: generateSessionToken(),
        expiresAt,
        createdAt: now,
        updatedAt: now,
        data,
      })
    },

    async invalidateSession(token: string): Promise<void> {
      await adapter.deleteSession(token)
    },

    shouldRefresh(session: Session): boolean {
      const now = Date.now()
      const updatedAt = session.updatedAt.getTime()
      const ageSeconds = (now - updatedAt) / 1000

      return ageSeconds >= updateAge
    },

    async refreshSession(session: Session): Promise<Session | null> {
      const now = new Date()
      const expiresAt = new Date(now.getTime() + maxAge * 1000)

      return adapter.updateSession(session.sessionToken, {
        updatedAt: now,
        expiresAt,
      })
    },
  }
}
