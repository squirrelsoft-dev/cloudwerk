import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  generateState,
  generateNonce,
  createOAuthState,
  storeState,
  consumeState,
  isValidStateFormat,
  createStateCookie,
  verifyStateCookie,
  DEFAULT_STATE_TTL,
} from '../providers/oauth/state.js'
import type { KVNamespaceLike } from '../providers/oauth/state.js'

describe('OAuth State Management', () => {
  describe('generateState', () => {
    it('should generate a 32 character string', () => {
      const state = generateState()

      expect(state.length).toBe(32)
    })

    it('should generate URL-safe base64 characters', () => {
      const state = generateState()

      expect(state).toMatch(/^[A-Za-z0-9_-]+$/)
    })

    it('should generate unique states', () => {
      const states = new Set<string>()
      for (let i = 0; i < 100; i++) {
        states.add(generateState())
      }
      expect(states.size).toBe(100)
    })
  })

  describe('generateNonce', () => {
    it('should generate a 32 character string', () => {
      const nonce = generateNonce()

      expect(nonce.length).toBe(32)
    })

    it('should generate URL-safe base64 characters', () => {
      const nonce = generateNonce()

      expect(nonce).toMatch(/^[A-Za-z0-9_-]+$/)
    })
  })

  describe('createOAuthState', () => {
    it('should create state with random state value', () => {
      const state = createOAuthState()

      expect(state.state).toBeDefined()
      expect(state.state.length).toBe(32)
    })

    it('should include createdAt timestamp', () => {
      const before = Date.now()
      const state = createOAuthState()
      const after = Date.now()

      expect(state.createdAt).toBeGreaterThanOrEqual(before)
      expect(state.createdAt).toBeLessThanOrEqual(after)
    })

    it('should include optional callbackUrl', () => {
      const state = createOAuthState({ callbackUrl: '/dashboard' })

      expect(state.callbackUrl).toBe('/dashboard')
    })

    it('should include optional codeVerifier', () => {
      const state = createOAuthState({ codeVerifier: 'test-verifier' })

      expect(state.codeVerifier).toBe('test-verifier')
    })

    it('should include optional nonce', () => {
      const state = createOAuthState({ nonce: 'test-nonce' })

      expect(state.nonce).toBe('test-nonce')
    })
  })

  describe('isValidStateFormat', () => {
    it('should return true for valid state format', () => {
      const state = generateState()

      expect(isValidStateFormat(state)).toBe(true)
    })

    it('should return false for too short state', () => {
      expect(isValidStateFormat('abc')).toBe(false)
    })

    it('should return false for too long state', () => {
      expect(isValidStateFormat('a'.repeat(33))).toBe(false)
    })

    it('should return false for invalid characters', () => {
      expect(isValidStateFormat('a'.repeat(31) + '!')).toBe(false)
    })
  })

  describe('KV State Storage', () => {
    let mockKV: KVNamespaceLike
    let storage: Map<string, string>

    beforeEach(() => {
      storage = new Map()
      mockKV = {
        get: vi.fn(async (key: string) => storage.get(key) ?? null),
        put: vi.fn(async (key: string, value: string) => {
          storage.set(key, value)
        }),
        delete: vi.fn(async (key: string) => {
          storage.delete(key)
        }),
      }
    })

    describe('storeState', () => {
      it('should store state in KV with default prefix', async () => {
        const state = createOAuthState()

        await storeState({ kv: mockKV }, state)

        expect(mockKV.put).toHaveBeenCalledWith(
          `oauth:state:${state.state}`,
          JSON.stringify(state),
          { expirationTtl: DEFAULT_STATE_TTL }
        )
      })

      it('should use custom prefix', async () => {
        const state = createOAuthState()

        await storeState({ kv: mockKV, prefix: 'custom:' }, state)

        expect(mockKV.put).toHaveBeenCalledWith(
          `custom:${state.state}`,
          expect.any(String),
          expect.any(Object)
        )
      })

      it('should use custom TTL', async () => {
        const state = createOAuthState()

        await storeState({ kv: mockKV, ttl: 300 }, state)

        expect(mockKV.put).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(String),
          { expirationTtl: 300 }
        )
      })
    })

    describe('consumeState', () => {
      it('should return stored state', async () => {
        const state = createOAuthState({ callbackUrl: '/test' })
        await storeState({ kv: mockKV }, state)

        const result = await consumeState({ kv: mockKV }, state.state)

        expect(result).toEqual(state)
      })

      it('should delete state after consumption', async () => {
        const state = createOAuthState()
        await storeState({ kv: mockKV }, state)

        await consumeState({ kv: mockKV }, state.state)

        expect(mockKV.delete).toHaveBeenCalledWith(`oauth:state:${state.state}`)
      })

      it('should return null for non-existent state', async () => {
        const result = await consumeState({ kv: mockKV }, 'non-existent')

        expect(result).toBeNull()
      })

      it('should return null for invalid JSON', async () => {
        storage.set('oauth:state:invalid', 'not-json')

        const result = await consumeState({ kv: mockKV }, 'invalid')

        expect(result).toBeNull()
      })

      it('should return null if state value mismatch', async () => {
        const state = createOAuthState()
        const wrongState = { ...state, state: 'different-value' }
        storage.set(`oauth:state:${state.state}`, JSON.stringify(wrongState))

        const result = await consumeState({ kv: mockKV }, state.state)

        expect(result).toBeNull()
      })
    })
  })

  describe('Cookie State Storage', () => {
    const testSecret = 'test-secret-key-at-least-32-chars'

    describe('createStateCookie', () => {
      it('should create a signed cookie value', async () => {
        const state = createOAuthState()

        const cookie = await createStateCookie({ secret: testSecret }, state)

        expect(cookie).toContain('.')
        const [payload, signature] = cookie.split('.')
        expect(payload).toBeDefined()
        expect(signature).toBeDefined()
      })

      it('should encode state as base64 in payload', async () => {
        const state = createOAuthState({ callbackUrl: '/test' })

        const cookie = await createStateCookie({ secret: testSecret }, state)
        const [payload] = cookie.split('.')
        const decoded = JSON.parse(atob(payload))

        expect(decoded.state).toBe(state.state)
        expect(decoded.callbackUrl).toBe('/test')
      })
    })

    describe('verifyStateCookie', () => {
      it('should verify and return valid state', async () => {
        const state = createOAuthState({ callbackUrl: '/dashboard' })
        const cookie = await createStateCookie({ secret: testSecret }, state)

        const result = await verifyStateCookie({ secret: testSecret }, cookie)

        expect(result).toEqual(state)
      })

      it('should return null for tampered payload', async () => {
        const state = createOAuthState()
        const cookie = await createStateCookie({ secret: testSecret }, state)
        const [_, signature] = cookie.split('.')
        const tamperedPayload = btoa(JSON.stringify({ ...state, state: 'tampered' }))

        const result = await verifyStateCookie(
          { secret: testSecret },
          `${tamperedPayload}.${signature}`
        )

        expect(result).toBeNull()
      })

      it('should return null for wrong secret', async () => {
        const state = createOAuthState()
        const cookie = await createStateCookie({ secret: testSecret }, state)

        const result = await verifyStateCookie({ secret: 'wrong-secret' }, cookie)

        expect(result).toBeNull()
      })

      it('should return null for expired state', async () => {
        const state = createOAuthState()
        // Backdate the createdAt
        state.createdAt = Date.now() - 700 * 1000 // 700 seconds ago
        const cookie = await createStateCookie({ secret: testSecret }, state)

        const result = await verifyStateCookie(
          { secret: testSecret, maxAge: 600 },
          cookie
        )

        expect(result).toBeNull()
      })

      it('should return null for malformed cookie', async () => {
        const result = await verifyStateCookie(
          { secret: testSecret },
          'not-a-valid-cookie'
        )

        expect(result).toBeNull()
      })

      it('should return null for invalid base64', async () => {
        const result = await verifyStateCookie(
          { secret: testSecret },
          'not-base64!!!.signature'
        )

        expect(result).toBeNull()
      })
    })
  })
})
