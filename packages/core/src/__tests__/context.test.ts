/**
 * @cloudwerk/core - Context Tests
 *
 * Tests for AsyncLocalStorage-based request context.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import {
  createContext,
  getContext,
  runWithContext,
  contextMiddleware,
} from '../context.js'
import type { CloudwerkContext } from '../types.js'

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Create a mock Hono context for testing.
 */
function createMockHonoContext(overrides: {
  url?: string
  method?: string
  env?: Record<string, unknown>
  executionCtx?: {
    waitUntil: (promise: Promise<unknown>) => void
    passThroughOnException: () => void
  }
} = {}) {
  const url = overrides.url ?? 'https://example.com/test'
  const method = overrides.method ?? 'GET'

  return {
    req: {
      raw: new Request(url, { method }),
      url,
      method,
    },
    env: overrides.env ?? {},
    executionCtx: overrides.executionCtx ?? {
      waitUntil: vi.fn(),
      passThroughOnException: vi.fn(),
    },
  } as unknown as import('hono').Context
}

// ============================================================================
// Context Creation Tests
// ============================================================================

describe('createContext', () => {
  it('should create context with request from Hono context', () => {
    const honoCtx = createMockHonoContext({ url: 'https://example.com/api/users' })
    const ctx = createContext(honoCtx)

    expect(ctx.request).toBeInstanceOf(Request)
    expect(ctx.request.url).toBe('https://example.com/api/users')
  })

  it('should create context with env from Hono context', () => {
    const env = { DB: { query: vi.fn() }, KV: { get: vi.fn() } }
    const honoCtx = createMockHonoContext({ env })
    const ctx = createContext<typeof env>(honoCtx)

    expect(ctx.env).toBe(env)
    expect(ctx.env.DB).toBe(env.DB)
    expect(ctx.env.KV).toBe(env.KV)
  })

  it('should create context with executionCtx from Hono context', () => {
    const executionCtx = {
      waitUntil: vi.fn(),
      passThroughOnException: vi.fn(),
    }
    const honoCtx = createMockHonoContext({ executionCtx })
    const ctx = createContext(honoCtx)

    expect(ctx.executionCtx).toBe(executionCtx)
  })

  it('should generate unique requestId for each context', () => {
    const honoCtx1 = createMockHonoContext()
    const honoCtx2 = createMockHonoContext()

    const ctx1 = createContext(honoCtx1)
    const ctx2 = createContext(honoCtx2)

    expect(ctx1.requestId).toBeDefined()
    expect(ctx2.requestId).toBeDefined()
    expect(ctx1.requestId).not.toBe(ctx2.requestId)
    // Verify UUID format
    expect(ctx1.requestId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
  })

  it('should initialize params as empty object', () => {
    const honoCtx = createMockHonoContext()
    const ctx = createContext(honoCtx)

    expect(ctx.params).toEqual({})
  })

  it('should provide fallback executionCtx when not available', () => {
    const honoCtx = createMockHonoContext()
    // Simulate environment that throws when accessing executionCtx (like Hono in tests)
    Object.defineProperty(honoCtx, 'executionCtx', {
      get() {
        throw new Error('This context has no ExecutionContext')
      },
    })

    const ctx = createContext(honoCtx)

    expect(ctx.executionCtx).toBeDefined()
    expect(typeof ctx.executionCtx.waitUntil).toBe('function')
    expect(typeof ctx.executionCtx.passThroughOnException).toBe('function')
  })
})

// ============================================================================
// Context get/set Tests
// ============================================================================

describe('context get/set', () => {
  it('should store and retrieve values', () => {
    const honoCtx = createMockHonoContext()
    const ctx = createContext(honoCtx)

    ctx.set('userId', 123)
    ctx.set('role', 'admin')

    expect(ctx.get('userId')).toBe(123)
    expect(ctx.get('role')).toBe('admin')
  })

  it('should return undefined for unset keys', () => {
    const honoCtx = createMockHonoContext()
    const ctx = createContext(honoCtx)

    expect(ctx.get('nonexistent')).toBeUndefined()
  })

  it('should support typed get', () => {
    const honoCtx = createMockHonoContext()
    const ctx = createContext(honoCtx)

    interface User {
      id: number
      name: string
    }

    ctx.set('user', { id: 1, name: 'Alice' })

    const user = ctx.get<User>('user')
    expect(user?.id).toBe(1)
    expect(user?.name).toBe('Alice')
  })

  it('should overwrite existing values', () => {
    const honoCtx = createMockHonoContext()
    const ctx = createContext(honoCtx)

    ctx.set('count', 1)
    ctx.set('count', 2)

    expect(ctx.get('count')).toBe(2)
  })

  it('should isolate data between contexts', () => {
    const honoCtx1 = createMockHonoContext()
    const honoCtx2 = createMockHonoContext()

    const ctx1 = createContext(honoCtx1)
    const ctx2 = createContext(honoCtx2)

    ctx1.set('value', 'from ctx1')
    ctx2.set('value', 'from ctx2')

    expect(ctx1.get('value')).toBe('from ctx1')
    expect(ctx2.get('value')).toBe('from ctx2')
  })
})

// ============================================================================
// getContext Tests
// ============================================================================

describe('getContext', () => {
  it('should throw descriptive error when called outside request', () => {
    expect(() => getContext()).toThrow('getContext() called outside of request handler')
    expect(() => getContext()).toThrow('nodejs_compat')
  })

  it('should return context when inside runWithContext', () => {
    const honoCtx = createMockHonoContext()
    const ctx = createContext(honoCtx)

    const result = runWithContext(ctx, () => {
      const currentCtx = getContext()
      return currentCtx.requestId
    })

    expect(result).toBe(ctx.requestId)
  })

  it('should return typed context with generic', () => {
    interface MyEnv {
      DB: { query: () => void }
    }

    const env = { DB: { query: vi.fn() } }
    const honoCtx = createMockHonoContext({ env })
    const ctx = createContext<MyEnv>(honoCtx)

    runWithContext(ctx, () => {
      const currentCtx = getContext<MyEnv>()
      expect(currentCtx.env.DB.query).toBeDefined()
    })
  })
})

// ============================================================================
// runWithContext Tests
// ============================================================================

describe('runWithContext', () => {
  it('should execute function within context', () => {
    const honoCtx = createMockHonoContext()
    const ctx = createContext(honoCtx)
    const fn = vi.fn(() => 42)

    const result = runWithContext(ctx, fn)

    expect(fn).toHaveBeenCalled()
    expect(result).toBe(42)
  })

  it('should make context available to nested calls', () => {
    const honoCtx = createMockHonoContext()
    const ctx = createContext(honoCtx)

    function nestedFunction() {
      return getContext().requestId
    }

    const result = runWithContext(ctx, () => {
      return nestedFunction()
    })

    expect(result).toBe(ctx.requestId)
  })

  it('should handle async functions', async () => {
    const honoCtx = createMockHonoContext()
    const ctx = createContext(honoCtx)

    const result = await runWithContext(ctx, async () => {
      await new Promise(resolve => setTimeout(resolve, 10))
      return getContext().requestId
    })

    expect(result).toBe(ctx.requestId)
  })

  it('should isolate concurrent requests', async () => {
    const honoCtx1 = createMockHonoContext()
    const honoCtx2 = createMockHonoContext()
    const ctx1 = createContext(honoCtx1)
    const ctx2 = createContext(honoCtx2)

    ctx1.set('requestNumber', 1)
    ctx2.set('requestNumber', 2)

    // Simulate concurrent requests
    const [result1, result2] = await Promise.all([
      runWithContext(ctx1, async () => {
        await new Promise(resolve => setTimeout(resolve, 20))
        return getContext().get<number>('requestNumber')
      }),
      runWithContext(ctx2, async () => {
        await new Promise(resolve => setTimeout(resolve, 10))
        return getContext().get<number>('requestNumber')
      }),
    ])

    expect(result1).toBe(1)
    expect(result2).toBe(2)
  })
})

// ============================================================================
// contextMiddleware Tests
// ============================================================================

describe('contextMiddleware', () => {
  it('should create middleware handler', () => {
    const middleware = contextMiddleware()
    expect(typeof middleware).toBe('function')
  })

  it('should make context available in handlers', async () => {
    const app = new Hono()
    let capturedCtx: CloudwerkContext | null = null

    app.use('*', contextMiddleware())
    app.get('/test', (c) => {
      capturedCtx = getContext()
      return c.json({ ok: true })
    })

    await app.request('/test')

    expect(capturedCtx).not.toBeNull()
    expect(capturedCtx!.requestId).toBeDefined()
    expect(capturedCtx!.request.url).toContain('/test')
  })

  it('should pass env to context', async () => {
    interface TestEnv {
      API_KEY: string
    }

    const app = new Hono<{ Bindings: TestEnv }>()
    let envValue: string | undefined

    app.use('*', contextMiddleware())
    app.get('/test', () => {
      const ctx = getContext<TestEnv>()
      envValue = ctx.env.API_KEY
      return new Response('ok')
    })

    // Simulate request with bindings
    await app.fetch(
      new Request('http://localhost/test'),
      { API_KEY: 'secret-key' }
    )

    expect(envValue).toBe('secret-key')
  })

  it('should allow middleware to set data accessible in handlers', async () => {
    const app = new Hono()
    let userData: unknown

    app.use('*', contextMiddleware())

    // Auth middleware that sets user data
    app.use('*', async (c, next) => {
      const ctx = getContext()
      ctx.set('user', { id: 1, email: 'test@example.com' })
      await next()
    })

    app.get('/profile', () => {
      const ctx = getContext()
      userData = ctx.get('user')
      return new Response('ok')
    })

    await app.request('/profile')

    expect(userData).toEqual({ id: 1, email: 'test@example.com' })
  })

  it('should isolate context between concurrent requests', async () => {
    const app = new Hono()
    const results: { id: number; value: number }[] = []

    app.use('*', contextMiddleware())
    app.use('*', async (c, next) => {
      const id = Number(c.req.query('id') || 0)
      const ctx = getContext()
      ctx.set('requestId', id)
      await next()
    })

    app.get('/test', async (c) => {
      const ctx = getContext()
      const id = ctx.get<number>('requestId') ?? 0

      // Simulate async work that could cause context mixing
      await new Promise(resolve => setTimeout(resolve, Math.random() * 20))

      const value = ctx.get<number>('requestId') ?? 0
      results.push({ id, value })

      return c.json({ id, value })
    })

    // Fire 5 concurrent requests
    await Promise.all([
      app.request('/test?id=1'),
      app.request('/test?id=2'),
      app.request('/test?id=3'),
      app.request('/test?id=4'),
      app.request('/test?id=5'),
    ])

    // Each request should have its own isolated value
    for (const result of results) {
      expect(result.id).toBe(result.value)
    }
  })
})

// ============================================================================
// TypeScript Generic Tests
// ============================================================================

describe('TypeScript generics', () => {
  it('should type env correctly', () => {
    interface CloudflareEnv {
      DB: { prepare: (sql: string) => { all: () => unknown[] } }
      KV: { get: (key: string) => Promise<string | null> }
      R2: { get: (key: string) => Promise<unknown> }
    }

    const env: CloudflareEnv = {
      DB: { prepare: () => ({ all: () => [] }) },
      KV: { get: async () => null },
      R2: { get: async () => null },
    }

    const honoCtx = createMockHonoContext({ env })
    const ctx = createContext<CloudflareEnv>(honoCtx)

    // TypeScript should recognize these as valid
    expect(ctx.env.DB.prepare).toBeDefined()
    expect(ctx.env.KV.get).toBeDefined()
    expect(ctx.env.R2.get).toBeDefined()
  })

  it('should type get/set correctly', () => {
    interface Session {
      userId: string
      role: 'admin' | 'user'
    }

    const honoCtx = createMockHonoContext()
    const ctx = createContext(honoCtx)

    const session: Session = { userId: '123', role: 'admin' }
    ctx.set<Session>('session', session)

    const retrieved = ctx.get<Session>('session')
    expect(retrieved?.userId).toBe('123')
    expect(retrieved?.role).toBe('admin')
  })
})

// ============================================================================
// requestId Tests
// ============================================================================

describe('requestId', () => {
  it('should be a valid UUID v4 format', () => {
    const honoCtx = createMockHonoContext()
    const ctx = createContext(honoCtx)

    // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    expect(ctx.requestId).toMatch(uuidRegex)
  })

  it('should be unique across many contexts', () => {
    const requestIds = new Set<string>()

    for (let i = 0; i < 100; i++) {
      const honoCtx = createMockHonoContext()
      const ctx = createContext(honoCtx)
      requestIds.add(ctx.requestId)
    }

    expect(requestIds.size).toBe(100)
  })
})
