/**
 * Rate Limiting Tests
 *
 * Tests for rate limiting utilities in @cloudwerk/core/middleware.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  createFixedWindowStorage,
  createSlidingWindowStorage,
  createRateLimiter,
  createRateLimitMiddleware,
  getClientIP,
  defaultKeyGenerator,
  type KVNamespaceLike,
  type RateLimitStorage,
} from '../../middleware/index.js'

// ============================================================================
// Mock KV Storage
// ============================================================================

function createMockKV(): KVNamespaceLike & { store: Map<string, string> } {
  const store = new Map<string, string>()

  return {
    store,
    async get(key: string): Promise<string | null> {
      return store.get(key) ?? null
    },
    async put(key: string, value: string, _options?: { expirationTtl?: number }): Promise<void> {
      store.set(key, value)
    },
    async delete(key: string): Promise<void> {
      store.delete(key)
    },
  }
}

// ============================================================================
// Fixed Window Storage Tests
// ============================================================================

describe('createFixedWindowStorage', () => {
  let kv: KVNamespaceLike & { store: Map<string, string> }
  let storage: RateLimitStorage

  beforeEach(() => {
    kv = createMockKV()
    storage = createFixedWindowStorage(kv)
  })

  it('should allow requests within limit', async () => {
    const result = await storage.increment('test-key', 60, 10)

    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(9)
    expect(result.limit).toBe(10)
    expect(result.retryAfter).toBeUndefined()
  })

  it('should track request count correctly', async () => {
    // Make 5 requests
    for (let i = 0; i < 5; i++) {
      await storage.increment('test-key', 60, 10)
    }

    const result = await storage.increment('test-key', 60, 10)

    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(4) // 10 - 6 = 4
  })

  it('should deny requests when limit exceeded', async () => {
    // Exhaust the limit
    for (let i = 0; i < 10; i++) {
      await storage.increment('test-key', 60, 10)
    }

    const result = await storage.increment('test-key', 60, 10)

    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
    expect(result.retryAfter).toBeGreaterThan(0)
  })

  it('should get status without incrementing', async () => {
    // Make some requests
    await storage.increment('test-key', 60, 10)
    await storage.increment('test-key', 60, 10)

    // Get status
    const status = await storage.get('test-key', 60, 10)

    expect(status.allowed).toBe(true)
    expect(status.remaining).toBe(8) // 10 - 2 = 8

    // Verify count didn't change
    const afterStatus = await storage.get('test-key', 60, 10)
    expect(afterStatus.remaining).toBe(8)
  })

  it('should reset counter', async () => {
    // Make some requests
    await storage.increment('test-key', 60, 10)
    await storage.increment('test-key', 60, 10)

    // Reset
    await storage.reset('test-key')

    // Should be fresh start
    const result = await storage.increment('test-key', 60, 10)
    expect(result.remaining).toBe(9)
  })

  it('should use custom prefix', async () => {
    const customStorage = createFixedWindowStorage(kv, 'custom:')
    await customStorage.increment('test-key', 60, 10)

    // Check that key uses custom prefix
    const keys = Array.from(kv.store.keys())
    expect(keys.some((k) => k.startsWith('custom:'))).toBe(true)
  })
})

// ============================================================================
// Sliding Window Storage Tests
// ============================================================================

describe('createSlidingWindowStorage', () => {
  let kv: KVNamespaceLike & { store: Map<string, string> }
  let storage: RateLimitStorage

  beforeEach(() => {
    kv = createMockKV()
    storage = createSlidingWindowStorage(kv)
  })

  it('should allow requests within limit', async () => {
    const result = await storage.increment('test-key', 60, 10)

    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(9)
    expect(result.limit).toBe(10)
  })

  it('should track request count correctly', async () => {
    // Make 5 requests
    for (let i = 0; i < 5; i++) {
      await storage.increment('test-key', 60, 10)
    }

    const result = await storage.increment('test-key', 60, 10)

    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(4)
  })

  it('should deny requests when limit exceeded', async () => {
    // Exhaust the limit
    for (let i = 0; i < 10; i++) {
      await storage.increment('test-key', 60, 10)
    }

    const result = await storage.increment('test-key', 60, 10)

    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
    expect(result.retryAfter).toBeGreaterThan(0)
  })

  it('should get status without incrementing', async () => {
    await storage.increment('test-key', 60, 10)
    await storage.increment('test-key', 60, 10)

    const status = await storage.get('test-key', 60, 10)

    expect(status.allowed).toBe(true)
    expect(status.remaining).toBe(8)

    // Verify count didn't change
    const afterStatus = await storage.get('test-key', 60, 10)
    expect(afterStatus.remaining).toBe(8)
  })

  it('should reset counter', async () => {
    await storage.increment('test-key', 60, 10)
    await storage.increment('test-key', 60, 10)

    await storage.reset('test-key')

    const result = await storage.increment('test-key', 60, 10)
    expect(result.remaining).toBe(9)
  })

  it('should use custom prefix', async () => {
    const customStorage = createSlidingWindowStorage(kv, 'sliding:')
    await customStorage.increment('test-key', 60, 10)

    const keys = Array.from(kv.store.keys())
    expect(keys.some((k) => k.startsWith('sliding:'))).toBe(true)
  })
})

// ============================================================================
// Rate Limiter Tests
// ============================================================================

describe('createRateLimiter', () => {
  let kv: KVNamespaceLike & { store: Map<string, string> }
  let storage: RateLimitStorage

  beforeEach(() => {
    kv = createMockKV()
    storage = createFixedWindowStorage(kv)
  })

  it('should allow requests and return result', async () => {
    const limiter = createRateLimiter({
      limit: 10,
      window: 60,
      storage,
    })

    const request = new Request('http://localhost/api', {
      headers: { 'CF-Connecting-IP': '192.168.1.1' },
    })

    const { response, result } = await limiter.check(request)

    expect(response).toBeUndefined()
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(9)
  })

  it('should return 429 response when rate limited', async () => {
    const limiter = createRateLimiter({
      limit: 2,
      window: 60,
      storage,
    })

    const request = new Request('http://localhost/api', {
      headers: { 'CF-Connecting-IP': '192.168.1.1' },
    })

    // Exhaust limit
    await limiter.check(request)
    await limiter.check(request)

    // Third request should be rate limited
    const { response, result } = await limiter.check(request)

    expect(response).toBeDefined()
    expect(response?.status).toBe(429)
    expect(result.allowed).toBe(false)

    const body = await response?.json()
    expect(body.error).toBe('Too Many Requests')
  })

  it('should generate correct headers', async () => {
    const limiter = createRateLimiter({
      limit: 10,
      window: 60,
      storage,
    })

    const result = {
      allowed: true,
      remaining: 5,
      limit: 10,
      reset: 1234567890,
    }

    const headers = limiter.headers(result)

    expect(headers['X-RateLimit-Limit']).toBe('10')
    expect(headers['X-RateLimit-Remaining']).toBe('5')
    expect(headers['X-RateLimit-Reset']).toBe('1234567890')
    expect(headers['Retry-After']).toBeUndefined()
  })

  it('should include Retry-After header when rate limited', async () => {
    const limiter = createRateLimiter({
      limit: 10,
      window: 60,
      storage,
    })

    const result = {
      allowed: false,
      remaining: 0,
      limit: 10,
      reset: 1234567890,
      retryAfter: 30,
    }

    const headers = limiter.headers(result)

    expect(headers['Retry-After']).toBe('30')
  })

  it('should get status without incrementing', async () => {
    const limiter = createRateLimiter({
      limit: 10,
      window: 60,
      storage,
    })

    const request = new Request('http://localhost/api', {
      headers: { 'CF-Connecting-IP': '192.168.1.1' },
    })

    // Make one request
    await limiter.check(request)

    // Get status
    const status = await limiter.status(request)

    expect(status.remaining).toBe(9)

    // Status again should be same
    const status2 = await limiter.status(request)
    expect(status2.remaining).toBe(9)
  })

  it('should reset rate limit', async () => {
    const limiter = createRateLimiter({
      limit: 10,
      window: 60,
      storage,
    })

    const request = new Request('http://localhost/api', {
      headers: { 'CF-Connecting-IP': '192.168.1.1' },
    })

    // Make some requests
    await limiter.check(request)
    await limiter.check(request)

    // Reset
    await limiter.reset(request)

    // Should be fresh
    const { result } = await limiter.check(request)
    expect(result.remaining).toBe(9)
  })

  it('should support custom key generator', async () => {
    const limiter = createRateLimiter({
      limit: 10,
      window: 60,
      storage,
      keyGenerator: () => 'custom-key',
    })

    const request1 = new Request('http://localhost/api', {
      headers: { 'CF-Connecting-IP': '192.168.1.1' },
    })
    const request2 = new Request('http://localhost/api', {
      headers: { 'CF-Connecting-IP': '192.168.1.2' },
    })

    // Both requests should share the same counter
    await limiter.check(request1)
    const { result } = await limiter.check(request2)

    expect(result.remaining).toBe(8) // 10 - 2
  })

  it('should support skip function', async () => {
    const limiter = createRateLimiter({
      limit: 1,
      window: 60,
      storage,
      skip: (request) => request.headers.get('X-API-Key') === 'secret',
    })

    const request = new Request('http://localhost/api', {
      headers: {
        'CF-Connecting-IP': '192.168.1.1',
        'X-API-Key': 'secret',
      },
    })

    // Make many requests - all should be allowed
    for (let i = 0; i < 5; i++) {
      const { response } = await limiter.check(request)
      expect(response).toBeUndefined()
    }
  })

  it('should support custom onRateLimited handler', async () => {
    const limiter = createRateLimiter({
      limit: 1,
      window: 60,
      storage,
      onRateLimited: () =>
        new Response('Custom rate limit message', { status: 429 }),
    })

    const request = new Request('http://localhost/api', {
      headers: { 'CF-Connecting-IP': '192.168.1.1' },
    })

    // Exhaust limit
    await limiter.check(request)

    // Should get custom response
    const { response } = await limiter.check(request)

    expect(response?.status).toBe(429)
    const text = await response?.text()
    expect(text).toBe('Custom rate limit message')
  })

  it('should use custom prefix', async () => {
    const limiter = createRateLimiter({
      limit: 10,
      window: 60,
      storage,
      prefix: 'api:',
    })

    const request = new Request('http://localhost/api', {
      headers: { 'CF-Connecting-IP': '192.168.1.1' },
    })

    await limiter.check(request)

    // Check that key uses custom prefix
    const keys = Array.from(kv.store.keys())
    expect(keys.some((k) => k.includes('api:'))).toBe(true)
  })
})

// ============================================================================
// Middleware Helper Tests
// ============================================================================

describe('createRateLimitMiddleware', () => {
  it('should create middleware from limiter', async () => {
    const kv = createMockKV()
    const storage = createFixedWindowStorage(kv)
    const limiter = createRateLimiter({
      limit: 10,
      window: 60,
      storage,
    })

    const middleware = createRateLimitMiddleware(limiter)

    const request = new Request('http://localhost/api', {
      headers: { 'CF-Connecting-IP': '192.168.1.1' },
    })

    const { response, result } = await middleware(request)

    expect(response).toBeUndefined()
    expect(result.allowed).toBe(true)
  })
})

// ============================================================================
// Utility Tests
// ============================================================================

describe('getClientIP', () => {
  it('should extract IP from CF-Connecting-IP header', () => {
    const request = new Request('http://localhost', {
      headers: { 'CF-Connecting-IP': '192.168.1.1' },
    })

    expect(getClientIP(request)).toBe('192.168.1.1')
  })

  it('should extract first IP from X-Forwarded-For header', () => {
    const request = new Request('http://localhost', {
      headers: { 'X-Forwarded-For': '192.168.1.1, 10.0.0.1, 172.16.0.1' },
    })

    expect(getClientIP(request)).toBe('192.168.1.1')
  })

  it('should handle X-Forwarded-For with spaces', () => {
    const request = new Request('http://localhost', {
      headers: { 'X-Forwarded-For': '  192.168.1.1  , 10.0.0.1' },
    })

    expect(getClientIP(request)).toBe('192.168.1.1')
  })

  it('should extract IP from X-Real-IP header', () => {
    const request = new Request('http://localhost', {
      headers: { 'X-Real-IP': '192.168.1.1' },
    })

    expect(getClientIP(request)).toBe('192.168.1.1')
  })

  it('should prefer CF-Connecting-IP over X-Forwarded-For', () => {
    const request = new Request('http://localhost', {
      headers: {
        'CF-Connecting-IP': '192.168.1.1',
        'X-Forwarded-For': '10.0.0.1',
      },
    })

    expect(getClientIP(request)).toBe('192.168.1.1')
  })

  it('should return unknown if no IP headers present', () => {
    const request = new Request('http://localhost')

    expect(getClientIP(request)).toBe('unknown')
  })
})

describe('defaultKeyGenerator', () => {
  it('should use getClientIP', () => {
    const request = new Request('http://localhost', {
      headers: { 'CF-Connecting-IP': '192.168.1.1' },
    })

    expect(defaultKeyGenerator(request)).toBe('192.168.1.1')
  })
})
