/**
 * @cloudwerk/security - X-Requested-With Validation Tests
 */

import { describe, it, expect, vi } from 'vitest'
import { requestedWithMiddleware } from '../request/middleware.js'

describe('requestedWithMiddleware', () => {
  const createNext = (response = new Response('OK')) => vi.fn(() => Promise.resolve(response))

  it('allows GET requests without header', async () => {
    const middleware = requestedWithMiddleware()
    const request = new Request('http://example.com')
    const next = createNext()

    await middleware(request, next)

    expect(next).toHaveBeenCalled()
  })

  it('blocks POST without X-Requested-With header', async () => {
    const middleware = requestedWithMiddleware()
    const request = new Request('http://example.com', { method: 'POST' })
    const next = createNext()

    const response = await middleware(request, next)

    expect(next).not.toHaveBeenCalled()
    expect(response.status).toBe(403)
    const body = await response.json()
    expect(body.error).toContain('Missing')
  })

  it('allows POST with X-Requested-With header', async () => {
    const middleware = requestedWithMiddleware()
    const request = new Request('http://example.com', {
      method: 'POST',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
      },
    })
    const next = createNext()

    await middleware(request, next)

    expect(next).toHaveBeenCalled()
  })

  it('blocks POST with wrong X-Requested-With value', async () => {
    const middleware = requestedWithMiddleware()
    const request = new Request('http://example.com', {
      method: 'POST',
      headers: {
        'X-Requested-With': 'fetch',
      },
    })
    const next = createNext()

    const response = await middleware(request, next)

    expect(next).not.toHaveBeenCalled()
    expect(response.status).toBe(403)
    const body = await response.json()
    expect(body.error).toContain('Invalid')
  })

  it('allows custom required value', async () => {
    const middleware = requestedWithMiddleware({
      requiredValue: 'fetch',
    })
    const request = new Request('http://example.com', {
      method: 'POST',
      headers: {
        'X-Requested-With': 'fetch',
      },
    })
    const next = createNext()

    await middleware(request, next)

    expect(next).toHaveBeenCalled()
  })

  it('skips excluded paths', async () => {
    const middleware = requestedWithMiddleware({
      excludePaths: ['/api/webhooks'],
    })
    const request = new Request('http://example.com/api/webhooks/stripe', {
      method: 'POST',
    })
    const next = createNext()

    await middleware(request, next)

    expect(next).toHaveBeenCalled()
  })

  it('validates PUT requests', async () => {
    const middleware = requestedWithMiddleware()
    const request = new Request('http://example.com', { method: 'PUT' })
    const next = createNext()

    const response = await middleware(request, next)

    expect(next).not.toHaveBeenCalled()
    expect(response.status).toBe(403)
  })

  it('validates DELETE requests', async () => {
    const middleware = requestedWithMiddleware()
    const request = new Request('http://example.com', { method: 'DELETE' })
    const next = createNext()

    const response = await middleware(request, next)

    expect(next).not.toHaveBeenCalled()
    expect(response.status).toBe(403)
  })

  it('validates PATCH requests', async () => {
    const middleware = requestedWithMiddleware()
    const request = new Request('http://example.com', { method: 'PATCH' })
    const next = createNext()

    const response = await middleware(request, next)

    expect(next).not.toHaveBeenCalled()
    expect(response.status).toBe(403)
  })
})
