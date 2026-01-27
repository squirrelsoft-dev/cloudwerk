/**
 * @cloudwerk/core - Route Config Tests
 *
 * Tests for route configuration storage, access, and validation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Hono } from 'hono'
import {
  getRouteConfig,
  setRouteConfig,
  validateRouteConfig,
  ROUTE_CONFIG_KEY,
} from '../route-config.js'
import {
  contextMiddleware,
  getContext,
  runWithContext,
  createContext,
} from '../context.js'
import type { RouteConfig } from '../types.js'

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Create a mock Hono context for testing.
 */
function createMockHonoContext() {
  return {
    req: {
      raw: new Request('https://example.com/test'),
      url: 'https://example.com/test',
      method: 'GET',
    },
    env: {},
    executionCtx: {
      waitUntil: vi.fn(),
      passThroughOnException: vi.fn(),
    },
  } as unknown as import('hono').Context
}

// ============================================================================
// getRouteConfig Tests
// ============================================================================

describe('getRouteConfig', () => {
  it('should return undefined when called outside of request context', () => {
    const config = getRouteConfig()
    expect(config).toBeUndefined()
  })

  it('should return undefined when no config has been set', () => {
    const honoCtx = createMockHonoContext()
    const ctx = createContext(honoCtx)

    const result = runWithContext(ctx, () => {
      return getRouteConfig()
    })

    expect(result).toBeUndefined()
  })

  it('should return config after setRouteConfig is called', () => {
    const honoCtx = createMockHonoContext()
    const ctx = createContext(honoCtx)

    const testConfig: RouteConfig = {
      auth: 'required',
      rateLimit: '100/1m',
      cache: 'private',
    }

    const result = runWithContext(ctx, () => {
      setRouteConfig(testConfig)
      return getRouteConfig()
    })

    expect(result).toEqual(testConfig)
  })

  it('should return undefined after setRouteConfig(undefined)', () => {
    const honoCtx = createMockHonoContext()
    const ctx = createContext(honoCtx)

    const testConfig: RouteConfig = { auth: 'required' }

    const result = runWithContext(ctx, () => {
      setRouteConfig(testConfig)
      setRouteConfig(undefined)
      return getRouteConfig()
    })

    expect(result).toBeUndefined()
  })

  it('should isolate config between concurrent requests', async () => {
    const honoCtx1 = createMockHonoContext()
    const honoCtx2 = createMockHonoContext()
    const ctx1 = createContext(honoCtx1)
    const ctx2 = createContext(honoCtx2)

    const config1: RouteConfig = { auth: 'required' }
    const config2: RouteConfig = { auth: 'none' }

    const [result1, result2] = await Promise.all([
      runWithContext(ctx1, async () => {
        setRouteConfig(config1)
        await new Promise((resolve) => setTimeout(resolve, 20))
        return getRouteConfig()
      }),
      runWithContext(ctx2, async () => {
        setRouteConfig(config2)
        await new Promise((resolve) => setTimeout(resolve, 10))
        return getRouteConfig()
      }),
    ])

    expect(result1).toEqual(config1)
    expect(result2).toEqual(config2)
  })
})

// ============================================================================
// setRouteConfig Tests
// ============================================================================

describe('setRouteConfig', () => {
  it('should store config using internal key', () => {
    const honoCtx = createMockHonoContext()
    const ctx = createContext(honoCtx)

    const testConfig: RouteConfig = { auth: 'optional' }

    runWithContext(ctx, () => {
      setRouteConfig(testConfig)

      // Verify it's stored with the internal key
      const storedValue = ctx.get(ROUTE_CONFIG_KEY)
      expect(storedValue).toEqual(testConfig)
    })
  })

  it('should throw when called outside of request context', () => {
    expect(() => setRouteConfig({ auth: 'required' })).toThrow(
      'getContext() called outside of request handler'
    )
  })

  it('should allow overwriting config', () => {
    const honoCtx = createMockHonoContext()
    const ctx = createContext(honoCtx)

    const config1: RouteConfig = { auth: 'required' }
    const config2: RouteConfig = { auth: 'none', cache: 'public' }

    const result = runWithContext(ctx, () => {
      setRouteConfig(config1)
      setRouteConfig(config2)
      return getRouteConfig()
    })

    expect(result).toEqual(config2)
  })
})

// ============================================================================
// validateRouteConfig Tests
// ============================================================================

describe('validateRouteConfig', () => {
  const filePath = '/app/api/route.ts'

  describe('null/undefined handling', () => {
    it('should return empty object for null', () => {
      const result = validateRouteConfig(null, filePath)
      expect(result).toEqual({})
    })

    it('should return empty object for undefined', () => {
      const result = validateRouteConfig(undefined, filePath)
      expect(result).toEqual({})
    })
  })

  describe('invalid config types', () => {
    it('should throw for non-object config', () => {
      expect(() => validateRouteConfig('string', filePath)).toThrow(
        'config must be an object'
      )
      expect(() => validateRouteConfig(123, filePath)).toThrow(
        'config must be an object'
      )
      expect(() => validateRouteConfig(true, filePath)).toThrow(
        'config must be an object'
      )
    })

    it('should throw for array config', () => {
      expect(() => validateRouteConfig([], filePath)).toThrow(
        'config must be an object, got array'
      )
    })
  })

  describe('auth validation', () => {
    it('should accept valid auth values', () => {
      expect(validateRouteConfig({ auth: 'required' }, filePath).auth).toBe('required')
      expect(validateRouteConfig({ auth: 'optional' }, filePath).auth).toBe('optional')
      expect(validateRouteConfig({ auth: 'none' }, filePath).auth).toBe('none')
    })

    it('should throw for invalid auth values', () => {
      expect(() => validateRouteConfig({ auth: 'invalid' }, filePath)).toThrow(
        "auth must be 'required', 'optional', or 'none'"
      )
      expect(() => validateRouteConfig({ auth: 123 }, filePath)).toThrow(
        "auth must be 'required', 'optional', or 'none'"
      )
    })
  })

  describe('rateLimit validation', () => {
    describe('string format', () => {
      it('should accept valid string formats', () => {
        expect(validateRouteConfig({ rateLimit: '100/1m' }, filePath).rateLimit).toBe('100/1m')
        expect(validateRouteConfig({ rateLimit: '50/1h' }, filePath).rateLimit).toBe('50/1h')
        expect(validateRouteConfig({ rateLimit: '1000/1d' }, filePath).rateLimit).toBe('1000/1d')
      })

      it('should throw for invalid string formats', () => {
        expect(() => validateRouteConfig({ rateLimit: '100' }, filePath)).toThrow(
          "rateLimit string must be in format 'requests/window'"
        )
        expect(() => validateRouteConfig({ rateLimit: '100/1x' }, filePath)).toThrow(
          "rateLimit string must be in format 'requests/window'"
        )
        expect(() => validateRouteConfig({ rateLimit: 'abc/1m' }, filePath)).toThrow(
          "rateLimit string must be in format 'requests/window'"
        )
      })
    })

    describe('object format', () => {
      it('should accept valid object formats', () => {
        const result1 = validateRouteConfig({ rateLimit: { requests: 100, window: '1m' } }, filePath)
        expect(result1.rateLimit).toEqual({ requests: 100, window: '1m' })

        const result2 = validateRouteConfig({ rateLimit: { requests: 50, window: '1h' } }, filePath)
        expect(result2.rateLimit).toEqual({ requests: 50, window: '1h' })
      })

      it('should throw for missing requests', () => {
        expect(() => validateRouteConfig({ rateLimit: { window: '1m' } }, filePath)).toThrow(
          'rateLimit.requests must be a positive integer'
        )
      })

      it('should throw for invalid requests', () => {
        expect(() => validateRouteConfig({ rateLimit: { requests: 0, window: '1m' } }, filePath)).toThrow(
          'rateLimit.requests must be a positive integer'
        )
        expect(() => validateRouteConfig({ rateLimit: { requests: -1, window: '1m' } }, filePath)).toThrow(
          'rateLimit.requests must be a positive integer'
        )
        expect(() => validateRouteConfig({ rateLimit: { requests: 1.5, window: '1m' } }, filePath)).toThrow(
          'rateLimit.requests must be a positive integer'
        )
      })

      it('should throw for missing window', () => {
        expect(() => validateRouteConfig({ rateLimit: { requests: 100 } }, filePath)).toThrow(
          'rateLimit.window must be a string'
        )
      })

      it('should throw for invalid window', () => {
        expect(() => validateRouteConfig({ rateLimit: { requests: 100, window: '1x' } }, filePath)).toThrow(
          "rateLimit.window must be a string like '1m', '1h', or '1d'"
        )
      })
    })

    it('should throw for invalid rateLimit type', () => {
      expect(() => validateRouteConfig({ rateLimit: 123 }, filePath)).toThrow(
        'rateLimit must be a string'
      )
      expect(() => validateRouteConfig({ rateLimit: [] }, filePath)).toThrow(
        'rateLimit must be a string'
      )
    })
  })

  describe('cache validation', () => {
    describe('string format', () => {
      it('should accept valid string values', () => {
        expect(validateRouteConfig({ cache: 'public' }, filePath).cache).toBe('public')
        expect(validateRouteConfig({ cache: 'private' }, filePath).cache).toBe('private')
        expect(validateRouteConfig({ cache: 'no-store' }, filePath).cache).toBe('no-store')
      })

      it('should throw for invalid string values', () => {
        expect(() => validateRouteConfig({ cache: 'invalid' }, filePath)).toThrow(
          "cache string must be 'public', 'private', or 'no-store'"
        )
      })
    })

    describe('object format', () => {
      it('should accept valid object with maxAge', () => {
        const result = validateRouteConfig({ cache: { maxAge: 3600 } }, filePath)
        expect(result.cache).toEqual({ maxAge: 3600 })
      })

      it('should accept valid object with maxAge and staleWhileRevalidate', () => {
        const result = validateRouteConfig({ cache: { maxAge: 3600, staleWhileRevalidate: 60 } }, filePath)
        expect(result.cache).toEqual({ maxAge: 3600, staleWhileRevalidate: 60 })
      })

      it('should accept maxAge of 0', () => {
        const result = validateRouteConfig({ cache: { maxAge: 0 } }, filePath)
        expect(result.cache).toEqual({ maxAge: 0 })
      })

      it('should throw for missing maxAge', () => {
        expect(() => validateRouteConfig({ cache: {} }, filePath)).toThrow(
          'cache.maxAge must be a non-negative integer'
        )
      })

      it('should throw for negative maxAge', () => {
        expect(() => validateRouteConfig({ cache: { maxAge: -1 } }, filePath)).toThrow(
          'cache.maxAge must be a non-negative integer'
        )
      })

      it('should throw for non-integer maxAge', () => {
        expect(() => validateRouteConfig({ cache: { maxAge: 3.5 } }, filePath)).toThrow(
          'cache.maxAge must be a non-negative integer'
        )
      })

      it('should throw for negative staleWhileRevalidate', () => {
        expect(() => validateRouteConfig({ cache: { maxAge: 3600, staleWhileRevalidate: -1 } }, filePath)).toThrow(
          'cache.staleWhileRevalidate must be a non-negative integer'
        )
      })

      it('should throw for non-integer staleWhileRevalidate', () => {
        expect(() => validateRouteConfig({ cache: { maxAge: 3600, staleWhileRevalidate: 1.5 } }, filePath)).toThrow(
          'cache.staleWhileRevalidate must be a non-negative integer'
        )
      })
    })

    it('should throw for invalid cache type', () => {
      expect(() => validateRouteConfig({ cache: 123 }, filePath)).toThrow(
        'cache must be a string'
      )
      expect(() => validateRouteConfig({ cache: [] }, filePath)).toThrow(
        'cache must be a string'
      )
    })
  })

  describe('custom keys', () => {
    it('should preserve custom keys', () => {
      const result = validateRouteConfig(
        {
          auth: 'required',
          customFlag: true,
          customData: { foo: 'bar' },
          customArray: [1, 2, 3],
        },
        filePath
      )

      expect(result.auth).toBe('required')
      expect(result.customFlag).toBe(true)
      expect(result.customData).toEqual({ foo: 'bar' })
      expect(result.customArray).toEqual([1, 2, 3])
    })

    it('should allow empty config with only custom keys', () => {
      const result = validateRouteConfig(
        {
          myPlugin: { enabled: true },
        },
        filePath
      )

      expect(result.myPlugin).toEqual({ enabled: true })
      expect(result.auth).toBeUndefined()
      expect(result.rateLimit).toBeUndefined()
      expect(result.cache).toBeUndefined()
    })
  })

  describe('full config validation', () => {
    it('should validate complete config', () => {
      const fullConfig = {
        auth: 'required' as const,
        rateLimit: { requests: 100, window: '1m' },
        cache: { maxAge: 3600, staleWhileRevalidate: 60 },
        customKey: 'custom value',
      }

      const result = validateRouteConfig(fullConfig, filePath)

      expect(result).toEqual(fullConfig)
    })
  })
})

// ============================================================================
// Integration Tests
// ============================================================================

describe('route config integration', () => {
  it('should work with Hono app and contextMiddleware', async () => {
    const app = new Hono()
    let capturedConfig: RouteConfig | undefined

    app.use('*', contextMiddleware())

    // Simulate config middleware (as registerRoutes would do)
    app.use('/test', async (c, next) => {
      setRouteConfig({ auth: 'required', cache: 'private' })
      await next()
    })

    app.get('/test', () => {
      capturedConfig = getRouteConfig()
      return new Response('ok')
    })

    await app.request('/test')

    expect(capturedConfig).toEqual({ auth: 'required', cache: 'private' })
  })

  it('should allow middleware to read config set by config middleware', async () => {
    const app = new Hono()
    let middlewareConfig: RouteConfig | undefined
    let handlerConfig: RouteConfig | undefined

    app.use('*', contextMiddleware())

    // Config middleware (runs first after context)
    app.use('/test', async (c, next) => {
      setRouteConfig({ auth: 'required' })
      await next()
    })

    // User middleware (runs after config middleware)
    app.use('/test', async (c, next) => {
      middlewareConfig = getRouteConfig()
      await next()
    })

    app.get('/test', () => {
      handlerConfig = getRouteConfig()
      return new Response('ok')
    })

    await app.request('/test')

    expect(middlewareConfig).toEqual({ auth: 'required' })
    expect(handlerConfig).toEqual({ auth: 'required' })
  })
})
