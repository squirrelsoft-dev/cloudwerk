/**
 * @cloudwerk/core - Bindings Tests
 *
 * Tests for the importable binding singletons.
 */

import { describe, it, expect, vi } from 'vitest'
import {
  bindings,
  getBinding,
  hasBinding,
  getBindingNames,
} from '../bindings.js'
import {
  createContext,
  runWithContext,
} from '../context.js'

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
// Error Handling Tests
// ============================================================================

describe('bindings - outside context errors', () => {
  it('should throw descriptive error when accessing binding outside request context', () => {
    expect(() => bindings.DB).toThrow('Binding accessed outside of request handler')
    expect(() => bindings.DB).toThrow('module-load time')
  })

  it('should throw descriptive error for getBinding() outside context', () => {
    expect(() => getBinding('DB')).toThrow('Binding accessed outside of request handler')
  })

  it('should throw descriptive error for hasBinding() outside context', () => {
    expect(() => hasBinding('DB')).toThrow('Binding accessed outside of request handler')
  })

  it('should throw descriptive error for getBindingNames() outside context', () => {
    expect(() => getBindingNames()).toThrow('Binding accessed outside of request handler')
  })

  it('should handle "has" check gracefully outside context', () => {
    // "in" operator should return false instead of throwing
    expect('DB' in bindings).toBe(false)
  })

  it('should return empty array for ownKeys outside context', () => {
    expect(Object.keys(bindings)).toEqual([])
  })
})

describe('bindings - missing binding errors', () => {
  it('should throw helpful error when binding not found', () => {
    const env = {
      DB: { prepare: vi.fn() },
      KV: { get: vi.fn() },
    }
    const honoCtx = createMockHonoContext({ env })
    const ctx = createContext(honoCtx)

    runWithContext(ctx, () => {
      expect(() => bindings.NONEXISTENT).toThrow("Binding 'NONEXISTENT' not found")
      expect(() => bindings.NONEXISTENT).toThrow('Available bindings: DB, KV')
    })
  })

  it('should show helpful message when no bindings exist', () => {
    const honoCtx = createMockHonoContext({ env: {} })
    const ctx = createContext(honoCtx)

    runWithContext(ctx, () => {
      expect(() => bindings.DB).toThrow('No bindings are configured')
    })
  })

  it('should provide suggestion for adding binding', () => {
    const honoCtx = createMockHonoContext({ env: {} })
    const ctx = createContext(honoCtx)

    runWithContext(ctx, () => {
      expect(() => bindings.DB).toThrow('cloudwerk bindings add')
    })
  })
})

// ============================================================================
// Binding Resolution Tests
// ============================================================================

describe('bindings - resolution', () => {
  it('should resolve binding from context', () => {
    const mockDB = { prepare: vi.fn(() => ({ all: vi.fn() })) }
    const env = { DB: mockDB }
    const honoCtx = createMockHonoContext({ env })
    const ctx = createContext(honoCtx)

    runWithContext(ctx, () => {
      expect(bindings.DB).toBe(mockDB)
    })
  })

  it('should resolve multiple bindings', () => {
    const mockDB = { prepare: vi.fn() }
    const mockKV = { get: vi.fn(), put: vi.fn() }
    const mockR2 = { get: vi.fn() }
    const env = { DB: mockDB, CACHE: mockKV, BUCKET: mockR2 }
    const honoCtx = createMockHonoContext({ env })
    const ctx = createContext(honoCtx)

    runWithContext(ctx, () => {
      expect(bindings.DB).toBe(mockDB)
      expect(bindings.CACHE).toBe(mockKV)
      expect(bindings.BUCKET).toBe(mockR2)
    })
  })

  it('should work with getBinding() helper', () => {
    const mockDB = { prepare: vi.fn() }
    const env = { DB: mockDB }
    const honoCtx = createMockHonoContext({ env })
    const ctx = createContext(honoCtx)

    runWithContext(ctx, () => {
      const db = getBinding<typeof mockDB>('DB')
      expect(db).toBe(mockDB)
      expect(db.prepare).toBe(mockDB.prepare)
    })
  })

  it('should check binding existence with hasBinding()', () => {
    const env = { DB: { prepare: vi.fn() }, SECRET_KEY: 'abc123' }
    const honoCtx = createMockHonoContext({ env })
    const ctx = createContext(honoCtx)

    runWithContext(ctx, () => {
      expect(hasBinding('DB')).toBe(true)
      expect(hasBinding('SECRET_KEY')).toBe(true)
      expect(hasBinding('NONEXISTENT')).toBe(false)
    })
  })

  it('should list binding names with getBindingNames()', () => {
    const env = { DB: { prepare: vi.fn() }, CACHE: { get: vi.fn() } }
    const honoCtx = createMockHonoContext({ env })
    const ctx = createContext(honoCtx)

    runWithContext(ctx, () => {
      const names = getBindingNames()
      expect(names).toContain('DB')
      expect(names).toContain('CACHE')
    })
  })

  it('should support "in" operator for bindings proxy', () => {
    const env = { DB: { prepare: vi.fn() }, CACHE: { get: vi.fn() } }
    const honoCtx = createMockHonoContext({ env })
    const ctx = createContext(honoCtx)

    runWithContext(ctx, () => {
      expect('DB' in bindings).toBe(true)
      expect('CACHE' in bindings).toBe(true)
      expect('NONEXISTENT' in bindings).toBe(false)
    })
  })

  it('should support Object.keys() on bindings proxy', () => {
    const env = { DB: { prepare: vi.fn() }, CACHE: { get: vi.fn() } }
    const honoCtx = createMockHonoContext({ env })
    const ctx = createContext(honoCtx)

    runWithContext(ctx, () => {
      const keys = Object.keys(bindings)
      expect(keys).toContain('DB')
      expect(keys).toContain('CACHE')
    })
  })
})

// ============================================================================
// Request Isolation Tests
// ============================================================================

describe('bindings - request isolation', () => {
  it('should isolate bindings between concurrent requests', async () => {
    const mockDB1 = { id: 1, prepare: vi.fn() }
    const mockDB2 = { id: 2, prepare: vi.fn() }

    const honoCtx1 = createMockHonoContext({ env: { DB: mockDB1 } })
    const honoCtx2 = createMockHonoContext({ env: { DB: mockDB2 } })
    const ctx1 = createContext(honoCtx1)
    const ctx2 = createContext(honoCtx2)

    // Simulate concurrent requests accessing bindings
    const [result1, result2] = await Promise.all([
      runWithContext(ctx1, async () => {
        await new Promise(resolve => setTimeout(resolve, 20))
        return (bindings.DB as typeof mockDB1).id
      }),
      runWithContext(ctx2, async () => {
        await new Promise(resolve => setTimeout(resolve, 10))
        return (bindings.DB as typeof mockDB2).id
      }),
    ])

    expect(result1).toBe(1)
    expect(result2).toBe(2)
  })

  it('should maintain binding isolation in nested async calls', async () => {
    const mockDB = { env: 'prod', query: vi.fn() }
    const mockCACHE = { env: 'prod', get: vi.fn() }
    const env = { DB: mockDB, CACHE: mockCACHE }
    const honoCtx = createMockHonoContext({ env })
    const ctx = createContext(honoCtx)

    async function nestedAsyncFunction() {
      await new Promise(resolve => setTimeout(resolve, 5))
      return bindings.DB
    }

    const result = await runWithContext(ctx, async () => {
      const db1 = bindings.DB
      const db2 = await nestedAsyncFunction()
      return db1 === db2
    })

    expect(result).toBe(true)
  })
})

// ============================================================================
// Edge Cases
// ============================================================================

describe('bindings - edge cases', () => {
  it('should ignore symbol property access', () => {
    const env = { DB: { prepare: vi.fn() } }
    const honoCtx = createMockHonoContext({ env })
    const ctx = createContext(honoCtx)

    runWithContext(ctx, () => {
      const symbol = Symbol('test')
      expect((bindings as Record<symbol, unknown>)[symbol]).toBeUndefined()
    })
  })

  it('should handle undefined binding values', () => {
    const env = { DB: { prepare: vi.fn() }, UNDEFINED_VAR: undefined }
    const honoCtx = createMockHonoContext({ env })
    const ctx = createContext(honoCtx)

    runWithContext(ctx, () => {
      // Accessing undefined binding should throw
      expect(() => bindings.UNDEFINED_VAR).toThrow("Binding 'UNDEFINED_VAR' not found")
    })
  })

  it('should exclude string values from available bindings list', () => {
    // String values are typically secrets/vars, not Cloudflare bindings
    const env = {
      DB: { prepare: vi.fn() },
      API_KEY: 'secret123',
      CACHE: { get: vi.fn() },
    }
    const honoCtx = createMockHonoContext({ env })
    const ctx = createContext(honoCtx)

    runWithContext(ctx, () => {
      const names = getBindingNames()
      expect(names).toContain('DB')
      expect(names).toContain('CACHE')
      // API_KEY is a string, so it should be excluded
      expect(names).not.toContain('API_KEY')
    })
  })

  it('should still allow accessing string values via bindings proxy', () => {
    const env = { API_KEY: 'secret123' }
    const honoCtx = createMockHonoContext({ env })
    const ctx = createContext(honoCtx)

    runWithContext(ctx, () => {
      // String values can still be accessed
      expect(bindings.API_KEY).toBe('secret123')
    })
  })
})
