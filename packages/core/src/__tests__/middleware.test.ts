/**
 * @cloudwerk/core - Middleware Adapter Tests
 *
 * Tests for createMiddlewareAdapter() that bridges Cloudwerk middleware to Hono.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { createMiddlewareAdapter } from '../middleware.js'
import {
  contextMiddleware,
  getContext,
  runWithContext,
  createContext,
} from '../context.js'
import type { Middleware, CloudwerkContext } from '../types.js'

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Create a test Hono app with context middleware pre-configured.
 * This mirrors the production setup where contextMiddleware runs first.
 */
function createTestApp(): Hono {
  const app = new Hono()
  app.use('*', contextMiddleware())
  return app
}

/**
 * Create a mock Hono context for lower-level testing.
 */
function createMockHonoContext(overrides: {
  url?: string
  method?: string
  body?: string
  headers?: Record<string, string>
} = {}) {
  const url = overrides.url ?? 'https://example.com/test'
  const method = overrides.method ?? 'GET'

  const request = new Request(url, {
    method,
    body: overrides.body,
    headers: overrides.headers,
  })

  return {
    req: {
      raw: request,
      url,
      method,
    },
    env: {},
    executionCtx: {
      waitUntil: vi.fn(),
      passThroughOnException: vi.fn(),
    },
    res: new Response('downstream response'),
  } as unknown as import('hono').Context
}

// ============================================================================
// Request Handling Tests
// ============================================================================

describe('createMiddlewareAdapter', () => {
  describe('request handling', () => {
    it('should pass standard Request to middleware', async () => {
      const app = createTestApp()
      let receivedRequest: Request | null = null

      const middleware: Middleware = async (request, next) => {
        receivedRequest = request
        return next()
      }

      app.use('/test', createMiddlewareAdapter(middleware))
      app.get('/test', () => new Response('ok'))

      await app.fetch(new Request('http://localhost/test'))

      expect(receivedRequest).toBeInstanceOf(Request)
      expect(receivedRequest!.url).toBe('http://localhost/test')
    })

    it('should provide raw request, not Hono wrapper', async () => {
      const app = createTestApp()
      let requestPrototype: unknown = null

      const middleware: Middleware = async (request, next) => {
        requestPrototype = Object.getPrototypeOf(request)
        return next()
      }

      app.use('/test', createMiddlewareAdapter(middleware))
      app.get('/test', () => new Response('ok'))

      await app.fetch(new Request('http://localhost/test'))

      // Should be standard Request, not HonoRequest
      expect(requestPrototype).toBe(Request.prototype)
    })

    it('should allow reading request body', async () => {
      const app = createTestApp()
      let body: string | null = null

      const middleware: Middleware = async (request, next) => {
        body = await request.text()
        return next()
      }

      app.use('/test', createMiddlewareAdapter(middleware))
      app.post('/test', () => new Response('ok'))

      await app.fetch(
        new Request('http://localhost/test', {
          method: 'POST',
          body: 'test body content',
        })
      )

      expect(body).toBe('test body content')
    })

    it('should allow reading request headers', async () => {
      const app = createTestApp()
      let authHeader: string | null = null

      const middleware: Middleware = async (request, next) => {
        authHeader = request.headers.get('Authorization')
        return next()
      }

      app.use('/test', createMiddlewareAdapter(middleware))
      app.get('/test', () => new Response('ok'))

      await app.fetch(
        new Request('http://localhost/test', {
          headers: { Authorization: 'Bearer token123' },
        })
      )

      expect(authHeader).toBe('Bearer token123')
    })
  })

  // ============================================================================
  // next() Function Tests
  // ============================================================================

  describe('next() function', () => {
    it('should return downstream response from next()', async () => {
      const app = createTestApp()
      let nextResponse: Response | null = null

      const middleware: Middleware = async (request, next) => {
        nextResponse = await next()
        return nextResponse
      }

      app.use('/test', createMiddlewareAdapter(middleware))
      app.get('/test', () => new Response('downstream content', { status: 200 }))

      const response = await app.fetch(new Request('http://localhost/test'))

      expect(nextResponse).toBeInstanceOf(Response)
      expect(await response.text()).toBe('downstream content')
    })

    it('should allow response modification after next()', async () => {
      const app = createTestApp()

      const middleware: Middleware = async (request, next) => {
        const response = await next()
        // Create new response with modified headers
        const newResponse = new Response(response.body, {
          status: response.status,
          headers: response.headers,
        })
        newResponse.headers.set('X-Custom-Header', 'added-by-middleware')
        return newResponse
      }

      app.use('/test', createMiddlewareAdapter(middleware))
      app.get('/test', () => new Response('ok'))

      const response = await app.fetch(new Request('http://localhost/test'))

      expect(response.headers.get('X-Custom-Header')).toBe('added-by-middleware')
    })

    it('should not require calling next() for early return', async () => {
      const app = createTestApp()
      let handlerCalled = false

      const middleware: Middleware = async () => {
        // Early return without calling next()
        return new Response('Unauthorized', { status: 401 })
      }

      app.use('/test', createMiddlewareAdapter(middleware))
      app.get('/test', () => {
        handlerCalled = true
        return new Response('ok')
      })

      const response = await app.fetch(new Request('http://localhost/test'))

      expect(response.status).toBe(401)
      expect(await response.text()).toBe('Unauthorized')
      expect(handlerCalled).toBe(false)
    })
  })

  // ============================================================================
  // Context Integration Tests
  // ============================================================================

  describe('context integration', () => {
    it('should allow getContext() within middleware', async () => {
      const app = createTestApp()
      let ctx: CloudwerkContext | null = null

      const middleware: Middleware = async (request, next) => {
        ctx = getContext()
        return next()
      }

      app.use('/test', createMiddlewareAdapter(middleware))
      app.get('/test', () => new Response('ok'))

      await app.fetch(new Request('http://localhost/test'))

      expect(ctx).not.toBeNull()
      expect(ctx!.requestId).toBeDefined()
    })

    it('should allow ctx.set() to store data', async () => {
      const app = createTestApp()
      let storedValue: unknown = null

      const middleware: Middleware = async (request, next) => {
        const ctx = getContext()
        ctx.set('testKey', 'testValue')
        return next()
      }

      app.use('/test', createMiddlewareAdapter(middleware))
      app.get('/test', () => {
        const ctx = getContext()
        storedValue = ctx.get('testKey')
        return new Response('ok')
      })

      await app.fetch(new Request('http://localhost/test'))

      expect(storedValue).toBe('testValue')
    })

    it('should make middleware data available in handlers', async () => {
      const app = createTestApp()
      let handlerUser: unknown = null

      const authMiddleware: Middleware = async (request, next) => {
        const ctx = getContext()
        ctx.set('user', { id: 123, name: 'Test User' })
        return next()
      }

      app.use('/test', createMiddlewareAdapter(authMiddleware))
      app.get('/test', () => {
        const ctx = getContext()
        handlerUser = ctx.get('user')
        return new Response('ok')
      })

      await app.fetch(new Request('http://localhost/test'))

      expect(handlerUser).toEqual({ id: 123, name: 'Test User' })
    })

    it('should isolate context between concurrent requests', async () => {
      const app = createTestApp()
      const results: { id: number; value: number }[] = []

      const middleware: Middleware = async (request, next) => {
        const url = new URL(request.url)
        const id = Number(url.searchParams.get('id') || 0)
        const ctx = getContext()
        ctx.set('requestId', id)
        return next()
      }

      app.use('/test', createMiddlewareAdapter(middleware))
      app.get('/test', async () => {
        const ctx = getContext()
        const id = ctx.get<number>('requestId') ?? 0

        // Simulate async work
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 20))

        const value = ctx.get<number>('requestId') ?? 0
        results.push({ id, value })

        return new Response('ok')
      })

      // Fire concurrent requests
      await Promise.all([
        app.fetch(new Request('http://localhost/test?id=1')),
        app.fetch(new Request('http://localhost/test?id=2')),
        app.fetch(new Request('http://localhost/test?id=3')),
        app.fetch(new Request('http://localhost/test?id=4')),
        app.fetch(new Request('http://localhost/test?id=5')),
      ])

      // Each request should maintain its own context
      for (const result of results) {
        expect(result.id).toBe(result.value)
      }
    })
  })

  // ============================================================================
  // Response Handling Tests
  // ============================================================================

  describe('response handling', () => {
    it('should allow returning custom Response', async () => {
      const app = createTestApp()

      const middleware: Middleware = async () => {
        return new Response(JSON.stringify({ custom: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      app.use('/test', createMiddlewareAdapter(middleware))
      app.get('/test', () => new Response('should not reach'))

      const response = await app.fetch(new Request('http://localhost/test'))

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toEqual({ custom: true })
    })

    it('should allow modifying response headers', async () => {
      const app = createTestApp()

      const middleware: Middleware = async (request, next) => {
        const start = Date.now()
        const response = await next()

        const newResponse = new Response(response.body, {
          status: response.status,
          headers: response.headers,
        })
        newResponse.headers.set('X-Response-Time', `${Date.now() - start}ms`)
        return newResponse
      }

      app.use('/test', createMiddlewareAdapter(middleware))
      app.get('/test', () => new Response('ok'))

      const response = await app.fetch(new Request('http://localhost/test'))

      expect(response.headers.get('X-Response-Time')).toMatch(/^\d+ms$/)
    })

    it('should preserve response body', async () => {
      const app = createTestApp()
      const testData = { message: 'Hello', count: 42 }

      const middleware: Middleware = async (request, next) => {
        return next()
      }

      app.use('/test', createMiddlewareAdapter(middleware))
      app.get('/test', () =>
        new Response(JSON.stringify(testData), {
          headers: { 'Content-Type': 'application/json' },
        })
      )

      const response = await app.fetch(new Request('http://localhost/test'))
      const data = await response.json()

      expect(data).toEqual(testData)
    })

    it('should handle streaming responses', async () => {
      const app = createTestApp()

      const middleware: Middleware = async (request, next) => {
        return next()
      }

      app.use('/test', createMiddlewareAdapter(middleware))
      app.get('/test', () => {
        const encoder = new TextEncoder()
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode('chunk1'))
            controller.enqueue(encoder.encode('chunk2'))
            controller.close()
          },
        })
        return new Response(stream)
      })

      const response = await app.fetch(new Request('http://localhost/test'))
      const text = await response.text()

      expect(text).toBe('chunk1chunk2')
    })
  })

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  describe('error handling', () => {
    it('should propagate errors from middleware', async () => {
      const app = createTestApp()

      const middleware: Middleware = async () => {
        throw new Error('Middleware error')
      }

      app.use('/test', createMiddlewareAdapter(middleware))
      app.get('/test', () => new Response('ok'))

      // Hono catches errors and returns 500
      const response = await app.fetch(new Request('http://localhost/test'))
      expect(response.status).toBe(500)
    })

    it('should propagate errors from next()', async () => {
      const app = createTestApp()

      const middleware: Middleware = async (request, next) => {
        return next()
      }

      app.use('/test', createMiddlewareAdapter(middleware))
      app.get('/test', () => {
        throw new Error('Handler error')
      })

      // Hono catches errors and returns 500
      const response = await app.fetch(new Request('http://localhost/test'))
      expect(response.status).toBe(500)
    })

    it('should handle async errors', async () => {
      const app = createTestApp()

      const middleware: Middleware = async () => {
        await Promise.resolve()
        throw new Error('Async middleware error')
      }

      app.use('/test', createMiddlewareAdapter(middleware))
      app.get('/test', () => new Response('ok'))

      const response = await app.fetch(new Request('http://localhost/test'))
      expect(response.status).toBe(500)
    })
  })

  // ============================================================================
  // Middleware Chaining Tests
  // ============================================================================

  describe('middleware chaining', () => {
    it('should execute middleware in order', async () => {
      const app = createTestApp()
      const executionOrder: string[] = []

      const middleware1: Middleware = async (request, next) => {
        executionOrder.push('middleware1-before')
        const response = await next()
        executionOrder.push('middleware1-after')
        return response
      }

      const middleware2: Middleware = async (request, next) => {
        executionOrder.push('middleware2-before')
        const response = await next()
        executionOrder.push('middleware2-after')
        return response
      }

      app.use('/test', createMiddlewareAdapter(middleware1))
      app.use('/test', createMiddlewareAdapter(middleware2))
      app.get('/test', () => {
        executionOrder.push('handler')
        return new Response('ok')
      })

      await app.fetch(new Request('http://localhost/test'))

      expect(executionOrder).toEqual([
        'middleware1-before',
        'middleware2-before',
        'handler',
        'middleware2-after',
        'middleware1-after',
      ])
    })

    it('should pass data between middleware via context', async () => {
      const app = createTestApp()
      let handlerData: unknown = null

      const middleware1: Middleware = async (request, next) => {
        const ctx = getContext()
        ctx.set('key1', 'value1')
        return next()
      }

      const middleware2: Middleware = async (request, next) => {
        const ctx = getContext()
        const value1 = ctx.get<string>('key1')
        ctx.set('key2', `${value1}-extended`)
        return next()
      }

      app.use('/test', createMiddlewareAdapter(middleware1))
      app.use('/test', createMiddlewareAdapter(middleware2))
      app.get('/test', () => {
        const ctx = getContext()
        handlerData = {
          key1: ctx.get('key1'),
          key2: ctx.get('key2'),
        }
        return new Response('ok')
      })

      await app.fetch(new Request('http://localhost/test'))

      expect(handlerData).toEqual({
        key1: 'value1',
        key2: 'value1-extended',
      })
    })

    it('should short-circuit on early return', async () => {
      const app = createTestApp()
      let middleware2Called = false
      let handlerCalled = false

      const authMiddleware: Middleware = async () => {
        // Simulating auth failure - return early
        return new Response('Forbidden', { status: 403 })
      }

      const loggingMiddleware: Middleware = async (request, next) => {
        middleware2Called = true
        return next()
      }

      app.use('/test', createMiddlewareAdapter(authMiddleware))
      app.use('/test', createMiddlewareAdapter(loggingMiddleware))
      app.get('/test', () => {
        handlerCalled = true
        return new Response('ok')
      })

      const response = await app.fetch(new Request('http://localhost/test'))

      expect(response.status).toBe(403)
      expect(middleware2Called).toBe(false)
      expect(handlerCalled).toBe(false)
    })
  })

  // ============================================================================
  // Type Tests
  // ============================================================================

  describe('TypeScript types', () => {
    it('should accept sync middleware', async () => {
      const app = createTestApp()

      const syncMiddleware: Middleware = (request, next) => {
        return next()
      }

      app.use('/test', createMiddlewareAdapter(syncMiddleware))
      app.get('/test', () => new Response('ok'))

      const response = await app.fetch(new Request('http://localhost/test'))
      expect(response.status).toBe(200)
    })

    it('should accept async middleware', async () => {
      const app = createTestApp()

      const asyncMiddleware: Middleware = async (request, next) => {
        await Promise.resolve()
        return next()
      }

      app.use('/test', createMiddlewareAdapter(asyncMiddleware))
      app.get('/test', () => new Response('ok'))

      const response = await app.fetch(new Request('http://localhost/test'))
      expect(response.status).toBe(200)
    })
  })
})
