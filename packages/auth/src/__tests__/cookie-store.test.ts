import { describe, it, expect } from 'vitest'
import { createCookieSessionStore } from '../session/cookie-store.js'
import type { Session } from '../types.js'

describe('createCookieSessionStore', () => {
  const testSecret = 'test-secret-key-that-is-at-least-32-characters-long'

  function createTestSession(overrides: Partial<Session> = {}): Session {
    const now = new Date()
    return {
      id: 'sess_123',
      userId: 'user_456',
      sessionToken: 'tok_789',
      expiresAt: new Date(now.getTime() + 3600000), // 1 hour from now
      createdAt: now,
      updatedAt: now,
      ...overrides,
    }
  }

  describe('encode', () => {
    it('encodes a session to a JWT string', async () => {
      const store = createCookieSessionStore({ secret: testSecret })
      const session = createTestSession()

      const token = await store.encode(session)

      expect(typeof token).toBe('string')
      // JWT has 3 parts separated by dots
      expect(token.split('.')).toHaveLength(3)
    })

    it('includes session data in the token', async () => {
      const store = createCookieSessionStore({ secret: testSecret })
      const session = createTestSession({
        data: { role: 'admin', permissions: ['read', 'write'] },
      })

      const token = await store.encode(session)
      const decoded = await store.decode(token)

      expect(decoded).not.toBeNull()
      expect(decoded!.data).toEqual({
        role: 'admin',
        permissions: ['read', 'write'],
      })
    })

    it('does not include empty data object', async () => {
      const store = createCookieSessionStore({ secret: testSecret })
      const session = createTestSession({ data: {} })

      const token = await store.encode(session)

      // Decode the payload to verify (middle part of JWT)
      const [, payloadB64] = token.split('.')
      const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')))
      expect(payload.dat).toBeUndefined()
    })
  })

  describe('decode', () => {
    it('decodes a valid token back to session', async () => {
      const store = createCookieSessionStore({ secret: testSecret })
      const session = createTestSession()

      const token = await store.encode(session)
      const decoded = await store.decode(token)

      expect(decoded).not.toBeNull()
      expect(decoded!.id).toBe(session.id)
      expect(decoded!.userId).toBe(session.userId)
      expect(decoded!.sessionToken).toBe(session.sessionToken)
    })

    it('returns null for expired token', async () => {
      const store = createCookieSessionStore({ secret: testSecret })
      const session = createTestSession({
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
      })

      const token = await store.encode(session)
      const decoded = await store.decode(token)

      expect(decoded).toBeNull()
    })

    it('returns null for invalid signature', async () => {
      const store1 = createCookieSessionStore({ secret: testSecret })
      const store2 = createCookieSessionStore({ secret: 'different-secret-that-is-also-long-enough' })
      const session = createTestSession()

      const token = await store1.encode(session)
      const decoded = await store2.decode(token)

      expect(decoded).toBeNull()
    })

    it('returns null for malformed token', async () => {
      const store = createCookieSessionStore({ secret: testSecret })

      const decoded = await store.decode('not-a-valid-jwt')

      expect(decoded).toBeNull()
    })

    it('returns null for token missing required claims', async () => {
      const store = createCookieSessionStore({ secret: testSecret })

      // Create a minimal JWT without required claims
      // This would fail validation
      const decoded = await store.decode('eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjk5OTk5OTk5OTl9.signature')

      expect(decoded).toBeNull()
    })

    it('preserves dates as Date objects', async () => {
      const store = createCookieSessionStore({ secret: testSecret })
      const session = createTestSession()

      const token = await store.encode(session)
      const decoded = await store.decode(token)

      expect(decoded!.expiresAt).toBeInstanceOf(Date)
      expect(decoded!.createdAt).toBeInstanceOf(Date)
      expect(decoded!.updatedAt).toBeInstanceOf(Date)
    })
  })

  describe('configuration', () => {
    it('uses custom algorithm', async () => {
      const store = createCookieSessionStore({
        secret: testSecret,
        algorithm: 'HS384',
      })
      const session = createTestSession()

      const token = await store.encode(session)

      // Decode header to check algorithm
      const [headerB64] = token.split('.')
      const header = JSON.parse(atob(headerB64.replace(/-/g, '+').replace(/_/g, '/')))
      expect(header.alg).toBe('HS384')
    })

    it('validates issuer when configured', async () => {
      const storeWithIssuer = createCookieSessionStore({
        secret: testSecret,
        issuer: 'https://myapp.com',
      })
      const storeWithDifferentIssuer = createCookieSessionStore({
        secret: testSecret,
        issuer: 'https://other.com',
      })
      const session = createTestSession()

      const token = await storeWithIssuer.encode(session)

      // Same issuer should work
      const decoded1 = await storeWithIssuer.decode(token)
      expect(decoded1).not.toBeNull()

      // Different issuer should fail
      const decoded2 = await storeWithDifferentIssuer.decode(token)
      expect(decoded2).toBeNull()
    })

    it('validates audience when configured', async () => {
      const storeWithAudience = createCookieSessionStore({
        secret: testSecret,
        audience: 'my-api',
      })
      const storeWithDifferentAudience = createCookieSessionStore({
        secret: testSecret,
        audience: 'other-api',
      })
      const session = createTestSession()

      const token = await storeWithAudience.encode(session)

      // Same audience should work
      const decoded1 = await storeWithAudience.decode(token)
      expect(decoded1).not.toBeNull()

      // Different audience should fail
      const decoded2 = await storeWithDifferentAudience.decode(token)
      expect(decoded2).toBeNull()
    })
  })

  describe('roundtrip', () => {
    it('preserves all session fields through encode/decode', async () => {
      const store = createCookieSessionStore({ secret: testSecret })
      const original = createTestSession({
        data: {
          role: 'admin',
          nested: { key: 'value' },
          array: [1, 2, 3],
        },
      })

      const token = await store.encode(original)
      const decoded = await store.decode(token)

      expect(decoded!.id).toBe(original.id)
      expect(decoded!.userId).toBe(original.userId)
      expect(decoded!.sessionToken).toBe(original.sessionToken)
      expect(decoded!.data).toEqual(original.data)

      // Dates lose millisecond precision due to JWT using seconds
      // Just verify they're within 1 second of each other
      expect(Math.abs(decoded!.expiresAt.getTime() - original.expiresAt.getTime())).toBeLessThan(1000)
      expect(Math.abs(decoded!.createdAt.getTime() - original.createdAt.getTime())).toBeLessThan(1000)
      expect(Math.abs(decoded!.updatedAt.getTime() - original.updatedAt.getTime())).toBeLessThan(1000)
    })
  })
})
