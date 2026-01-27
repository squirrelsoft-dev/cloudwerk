/**
 * Tests for Cloudwerk-native handler signature types and detection.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { CloudwerkHandler, CloudwerkHandlerContext } from '../types.js'
import { getContext, runWithContext, createContext } from '../context.js'

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
      param: () => ({}),
    },
    env: overrides.env ?? {},
    executionCtx: overrides.executionCtx ?? {
      waitUntil: vi.fn(),
      passThroughOnException: vi.fn(),
    },
  } as unknown as import('hono').Context
}

// ============================================================================
// CloudwerkHandler Type Tests
// ============================================================================

describe('CloudwerkHandler type', () => {
  describe('handler signature detection', () => {
    it('detects Cloudwerk handler by arity 2', () => {
      const cloudwerkHandler: CloudwerkHandler = (request, context) => {
        return new Response('ok')
      }

      expect(cloudwerkHandler.length).toBe(2)
    })

    it('detects legacy Hono handler by arity 1', () => {
      const honoHandler = (c: unknown) => {
        return new Response('ok')
      }

      expect(honoHandler.length).toBe(1)
    })
  })

  describe('params flow', () => {
    it('context.params contains route parameters', () => {
      const handler: CloudwerkHandler<{ id: string }> = (request, { params }) => {
        expect(params.id).toBe('123')
        return new Response('ok')
      }

      const request = new Request('http://example.com/users/123')
      handler(request, { params: { id: '123' } })
    })

    it('getContext().params matches context.params after assignment', () => {
      const mockHonoContext = createMockHonoContext({
        url: 'http://example.com/users/123',
      })

      const ctx = createContext(mockHonoContext)

      runWithContext(ctx, () => {
        // Simulate what wrapCloudwerkHandler does
        const params = { id: '123' }
        Object.assign(ctx.params, params)

        // Verify getContext().params matches
        const currentCtx = getContext()
        expect(currentCtx.params).toEqual({ id: '123' })
      })
    })
  })

  describe('type safety', () => {
    it('CloudwerkHandlerContext accepts typed params', () => {
      interface UserParams {
        userId: string
        postId: string
      }

      const context: CloudwerkHandlerContext<UserParams> = {
        params: { userId: '1', postId: '2' }
      }

      expect(context.params.userId).toBe('1')
      expect(context.params.postId).toBe('2')
    })

    it('CloudwerkHandler enforces return type', () => {
      // This should compile - returns Response
      const validHandler: CloudwerkHandler = () => new Response('ok')

      // This should compile - returns Promise<Response>
      const asyncHandler: CloudwerkHandler = async () => new Response('ok')

      expect(validHandler(new Request('http://example.com'), { params: {} })).toBeInstanceOf(Response)
    })
  })

  describe('concurrent request isolation', () => {
    it('params are isolated between concurrent requests', async () => {
      const mockHonoContext1 = createMockHonoContext({
        url: 'http://example.com/users/1',
      })

      const mockHonoContext2 = createMockHonoContext({
        url: 'http://example.com/users/2',
      })

      const ctx1 = createContext(mockHonoContext1)
      const ctx2 = createContext(mockHonoContext2)

      // Simulate concurrent requests
      const results = await Promise.all([
        runWithContext(ctx1, async () => {
          Object.assign(ctx1.params, { id: '1' })
          // Small delay to interleave with other request
          await new Promise(resolve => setTimeout(resolve, 10))
          return getContext().params.id
        }),
        runWithContext(ctx2, async () => {
          Object.assign(ctx2.params, { id: '2' })
          await new Promise(resolve => setTimeout(resolve, 5))
          return getContext().params.id
        }),
      ])

      expect(results).toEqual(['1', '2'])
    })
  })
})

// ============================================================================
// Handler Signature Behavior Tests
// ============================================================================

describe('handler signature behavior', () => {
  it('Cloudwerk handler receives standard Request object', () => {
    const handler: CloudwerkHandler = (request, context) => {
      expect(request).toBeInstanceOf(Request)
      expect(request.url).toBe('http://example.com/api/users')
      return new Response('ok')
    }

    const request = new Request('http://example.com/api/users')
    handler(request, { params: {} })
  })

  it('Cloudwerk handler can read request body', async () => {
    const handler: CloudwerkHandler = async (request, context) => {
      const body = await request.json()
      expect(body).toEqual({ name: 'Alice' })
      return new Response('ok')
    }

    const request = new Request('http://example.com/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Alice' }),
    })

    await handler(request, { params: {} })
  })

  it('Cloudwerk handler can read request headers', () => {
    const handler: CloudwerkHandler = (request, context) => {
      const authHeader = request.headers.get('Authorization')
      expect(authHeader).toBe('Bearer token123')
      return new Response('ok')
    }

    const request = new Request('http://example.com/api/users', {
      headers: { 'Authorization': 'Bearer token123' },
    })

    handler(request, { params: {} })
  })

  it('Cloudwerk handler can access params from context', () => {
    interface Params {
      userId: string
      postId: string
    }

    const handler: CloudwerkHandler<Params> = (request, { params }) => {
      expect(params.userId).toBe('123')
      expect(params.postId).toBe('456')
      return new Response('ok')
    }

    const request = new Request('http://example.com/api/users/123/posts/456')
    handler(request, { params: { userId: '123', postId: '456' } })
  })
})

// ============================================================================
// Integration with getContext Tests
// ============================================================================

describe('integration with getContext', () => {
  it('handler can access env via getContext()', () => {
    interface TestEnv {
      API_KEY: string
    }

    const mockHonoContext = createMockHonoContext({
      env: { API_KEY: 'secret-key' },
    })

    const ctx = createContext<TestEnv>(mockHonoContext)

    const handler: CloudwerkHandler = (request, context) => {
      const { env } = getContext<TestEnv>()
      expect(env.API_KEY).toBe('secret-key')
      return new Response('ok')
    }

    runWithContext(ctx, () => {
      handler(new Request('http://example.com'), { params: {} })
    })
  })

  it('handler can access requestId via getContext()', () => {
    const mockHonoContext = createMockHonoContext()
    const ctx = createContext(mockHonoContext)

    let capturedRequestId: string | undefined

    const handler: CloudwerkHandler = (request, context) => {
      capturedRequestId = getContext().requestId
      return new Response('ok')
    }

    runWithContext(ctx, () => {
      handler(new Request('http://example.com'), { params: {} })
    })

    expect(capturedRequestId).toBe(ctx.requestId)
  })

  it('handler can use get/set via getContext()', () => {
    const mockHonoContext = createMockHonoContext()
    const ctx = createContext(mockHonoContext)

    // Simulate middleware setting data
    ctx.set('user', { id: 1, name: 'Alice' })

    const handler: CloudwerkHandler = (request, context) => {
      const user = getContext().get<{ id: number; name: string }>('user')
      expect(user).toEqual({ id: 1, name: 'Alice' })
      return new Response('ok')
    }

    runWithContext(ctx, () => {
      handler(new Request('http://example.com'), { params: {} })
    })
  })
})
