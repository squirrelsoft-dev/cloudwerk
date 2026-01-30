import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createKVSessionAdapter } from '../session/kv-adapter.js'
import type { UserAdapter, User } from '../types.js'

/**
 * Mock KV namespace for testing.
 */
function createMockKV() {
  const store = new Map<string, { value: string; expirationTtl?: number }>()

  return {
    store,
    async get(key: string): Promise<string | null> {
      const entry = store.get(key)
      return entry?.value ?? null
    },
    async put(
      key: string,
      value: string,
      options?: { expirationTtl?: number }
    ): Promise<void> {
      store.set(key, { value, expirationTtl: options?.expirationTtl })
    },
    async delete(key: string): Promise<void> {
      store.delete(key)
    },
  }
}

describe('createKVSessionAdapter', () => {
  let mockKV: ReturnType<typeof createMockKV>

  beforeEach(() => {
    mockKV = createMockKV()
  })

  describe('createSession', () => {
    it('creates a session with generated ID', async () => {
      const adapter = createKVSessionAdapter({ binding: mockKV })

      const session = await adapter.createSession({
        userId: 'user_123',
        sessionToken: 'token_abc',
        expiresAt: new Date(Date.now() + 3600000),
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      expect(session.id).toBeDefined()
      expect(session.userId).toBe('user_123')
      expect(session.sessionToken).toBe('token_abc')
    })

    it('stores session in KV with TTL', async () => {
      const adapter = createKVSessionAdapter({ binding: mockKV })
      const expiresAt = new Date(Date.now() + 3600000) // 1 hour

      await adapter.createSession({
        userId: 'user_123',
        sessionToken: 'token_abc',
        expiresAt,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const stored = mockKV.store.get('session:token_abc')
      expect(stored).toBeDefined()
      expect(stored!.expirationTtl).toBeGreaterThan(0)
      expect(stored!.expirationTtl).toBeLessThanOrEqual(3600)
    })

    it('uses custom prefix', async () => {
      const adapter = createKVSessionAdapter({
        binding: mockKV,
        prefix: 'auth:session:',
      })

      await adapter.createSession({
        userId: 'user_123',
        sessionToken: 'token_abc',
        expiresAt: new Date(Date.now() + 3600000),
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      expect(mockKV.store.has('auth:session:token_abc')).toBe(true)
      expect(mockKV.store.has('session:token_abc')).toBe(false)
    })

    it('adds to user index when enabled', async () => {
      const adapter = createKVSessionAdapter({
        binding: mockKV,
        enableUserIndex: true,
      })

      await adapter.createSession({
        userId: 'user_123',
        sessionToken: 'token_abc',
        expiresAt: new Date(Date.now() + 3600000),
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const userIndex = await mockKV.get('user_sessions:user_123')
      expect(userIndex).toBeDefined()
      expect(JSON.parse(userIndex!)).toContain('token_abc')
    })
  })

  describe('getSession', () => {
    it('retrieves an existing session', async () => {
      const adapter = createKVSessionAdapter({ binding: mockKV })
      const created = await adapter.createSession({
        userId: 'user_123',
        sessionToken: 'token_abc',
        expiresAt: new Date(Date.now() + 3600000),
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const session = await adapter.getSession('token_abc')

      expect(session).not.toBeNull()
      expect(session!.id).toBe(created.id)
      expect(session!.userId).toBe('user_123')
    })

    it('returns null for non-existent session', async () => {
      const adapter = createKVSessionAdapter({ binding: mockKV })

      const session = await adapter.getSession('nonexistent')

      expect(session).toBeNull()
    })

    it('returns null and deletes expired session', async () => {
      const adapter = createKVSessionAdapter({ binding: mockKV })

      // Create a session that's already expired
      await adapter.createSession({
        userId: 'user_123',
        sessionToken: 'token_abc',
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const session = await adapter.getSession('token_abc')

      expect(session).toBeNull()
    })

    it('deserializes dates correctly', async () => {
      const adapter = createKVSessionAdapter({ binding: mockKV })
      const now = new Date()

      await adapter.createSession({
        userId: 'user_123',
        sessionToken: 'token_abc',
        expiresAt: new Date(Date.now() + 3600000),
        createdAt: now,
        updatedAt: now,
      })

      const session = await adapter.getSession('token_abc')

      expect(session!.createdAt).toBeInstanceOf(Date)
      expect(session!.updatedAt).toBeInstanceOf(Date)
      expect(session!.expiresAt).toBeInstanceOf(Date)
    })
  })

  describe('getSessionAndUser', () => {
    it('throws error without userAdapter', async () => {
      const adapter = createKVSessionAdapter({ binding: mockKV })

      await adapter.createSession({
        userId: 'user_123',
        sessionToken: 'token_abc',
        expiresAt: new Date(Date.now() + 3600000),
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      await expect(adapter.getSessionAndUser('token_abc')).rejects.toThrow(
        'userAdapter is required'
      )
    })

    it('returns session and user when both exist', async () => {
      const mockUser: User = {
        id: 'user_123',
        email: 'test@example.com',
        emailVerified: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const mockUserAdapter: UserAdapter = {
        getUser: vi.fn().mockResolvedValue(mockUser),
        createUser: vi.fn(),
        getUserByEmail: vi.fn(),
        getUserByAccount: vi.fn(),
        updateUser: vi.fn(),
        deleteUser: vi.fn(),
        linkAccount: vi.fn(),
        unlinkAccount: vi.fn(),
        createVerificationToken: vi.fn(),
        useVerificationToken: vi.fn(),
      }

      const adapter = createKVSessionAdapter({
        binding: mockKV,
        userAdapter: mockUserAdapter,
      })

      await adapter.createSession({
        userId: 'user_123',
        sessionToken: 'token_abc',
        expiresAt: new Date(Date.now() + 3600000),
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await adapter.getSessionAndUser('token_abc')

      expect(result).not.toBeNull()
      expect(result!.session.userId).toBe('user_123')
      expect(result!.user.id).toBe('user_123')
    })

    it('returns null when user not found', async () => {
      const mockUserAdapter: UserAdapter = {
        getUser: vi.fn().mockResolvedValue(null),
        createUser: vi.fn(),
        getUserByEmail: vi.fn(),
        getUserByAccount: vi.fn(),
        updateUser: vi.fn(),
        deleteUser: vi.fn(),
        linkAccount: vi.fn(),
        unlinkAccount: vi.fn(),
        createVerificationToken: vi.fn(),
        useVerificationToken: vi.fn(),
      }

      const adapter = createKVSessionAdapter({
        binding: mockKV,
        userAdapter: mockUserAdapter,
      })

      await adapter.createSession({
        userId: 'user_123',
        sessionToken: 'token_abc',
        expiresAt: new Date(Date.now() + 3600000),
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await adapter.getSessionAndUser('token_abc')

      expect(result).toBeNull()
    })
  })

  describe('updateSession', () => {
    it('updates session data', async () => {
      const adapter = createKVSessionAdapter({ binding: mockKV })

      await adapter.createSession({
        userId: 'user_123',
        sessionToken: 'token_abc',
        expiresAt: new Date(Date.now() + 3600000),
        createdAt: new Date(),
        updatedAt: new Date(),
        data: { role: 'user' },
      })

      const updated = await adapter.updateSession('token_abc', {
        data: { role: 'admin' },
      })

      expect(updated).not.toBeNull()
      expect(updated!.data).toEqual({ role: 'admin' })
    })

    it('updates updatedAt timestamp', async () => {
      const adapter = createKVSessionAdapter({ binding: mockKV })
      const originalUpdatedAt = new Date(Date.now() - 10000)

      await adapter.createSession({
        userId: 'user_123',
        sessionToken: 'token_abc',
        expiresAt: new Date(Date.now() + 3600000),
        createdAt: new Date(),
        updatedAt: originalUpdatedAt,
      })

      const updated = await adapter.updateSession('token_abc', {})

      expect(updated!.updatedAt.getTime()).toBeGreaterThan(
        originalUpdatedAt.getTime()
      )
    })

    it('returns null for non-existent session', async () => {
      const adapter = createKVSessionAdapter({ binding: mockKV })

      const result = await adapter.updateSession('nonexistent', {})

      expect(result).toBeNull()
    })
  })

  describe('deleteSession', () => {
    it('deletes a session', async () => {
      const adapter = createKVSessionAdapter({ binding: mockKV })

      await adapter.createSession({
        userId: 'user_123',
        sessionToken: 'token_abc',
        expiresAt: new Date(Date.now() + 3600000),
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      await adapter.deleteSession('token_abc')

      const session = await adapter.getSession('token_abc')
      expect(session).toBeNull()
    })

    it('removes from user index when enabled', async () => {
      const adapter = createKVSessionAdapter({
        binding: mockKV,
        enableUserIndex: true,
      })

      await adapter.createSession({
        userId: 'user_123',
        sessionToken: 'token_abc',
        expiresAt: new Date(Date.now() + 3600000),
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      await adapter.deleteSession('token_abc')

      const userIndex = await mockKV.get('user_sessions:user_123')
      // Index should be deleted when empty
      expect(userIndex).toBeNull()
    })
  })

  describe('deleteSessionsForUser', () => {
    it('throws error when user index is disabled', async () => {
      const adapter = createKVSessionAdapter({ binding: mockKV })

      await expect(adapter.deleteSessionsForUser('user_123')).rejects.toThrow(
        'deleteSessionsForUser requires enableUserIndex: true'
      )
    })

    it('deletes all sessions for a user', async () => {
      const adapter = createKVSessionAdapter({
        binding: mockKV,
        enableUserIndex: true,
      })

      // Create multiple sessions
      await adapter.createSession({
        userId: 'user_123',
        sessionToken: 'token_1',
        expiresAt: new Date(Date.now() + 3600000),
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      await adapter.createSession({
        userId: 'user_123',
        sessionToken: 'token_2',
        expiresAt: new Date(Date.now() + 3600000),
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const count = await adapter.deleteSessionsForUser('user_123')

      expect(count).toBe(2)
      expect(await adapter.getSession('token_1')).toBeNull()
      expect(await adapter.getSession('token_2')).toBeNull()
    })

    it('returns 0 when user has no sessions', async () => {
      const adapter = createKVSessionAdapter({
        binding: mockKV,
        enableUserIndex: true,
      })

      const count = await adapter.deleteSessionsForUser('user_123')

      expect(count).toBe(0)
    })
  })

  describe('getSessionsForUser', () => {
    it('throws error when user index is disabled', async () => {
      const adapter = createKVSessionAdapter({ binding: mockKV })

      await expect(adapter.getSessionsForUser('user_123')).rejects.toThrow(
        'getSessionsForUser requires enableUserIndex: true'
      )
    })

    it('returns all session tokens for a user', async () => {
      const adapter = createKVSessionAdapter({
        binding: mockKV,
        enableUserIndex: true,
      })

      await adapter.createSession({
        userId: 'user_123',
        sessionToken: 'token_1',
        expiresAt: new Date(Date.now() + 3600000),
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      await adapter.createSession({
        userId: 'user_123',
        sessionToken: 'token_2',
        expiresAt: new Date(Date.now() + 3600000),
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const tokens = await adapter.getSessionsForUser('user_123')

      expect(tokens).toHaveLength(2)
      expect(tokens).toContain('token_1')
      expect(tokens).toContain('token_2')
    })

    it('returns empty array when user has no sessions', async () => {
      const adapter = createKVSessionAdapter({
        binding: mockKV,
        enableUserIndex: true,
      })

      const tokens = await adapter.getSessionsForUser('user_123')

      expect(tokens).toEqual([])
    })
  })
})
