/**
 * @cloudwerk/security - Origin Validation Tests
 */

import { describe, it, expect, vi } from 'vitest'
import { originValidationMiddleware } from '../origin/middleware.js'

describe('originValidationMiddleware', () => {
  const createNext = (response = new Response('OK')) => vi.fn(() => Promise.resolve(response))

  it('skips validation when no origins configured', async () => {
    const middleware = originValidationMiddleware()
    const request = new Request('http://example.com', { method: 'POST' })
    const next = createNext()

    await middleware(request, next)

    expect(next).toHaveBeenCalled()
  })

  it('allows GET requests without validation', async () => {
    const middleware = originValidationMiddleware({
      allowedOrigins: ['https://allowed.com'],
    })
    const request = new Request('http://example.com')
    const next = createNext()

    await middleware(request, next)

    expect(next).toHaveBeenCalled()
  })

  it('blocks POST without Origin header', async () => {
    const middleware = originValidationMiddleware({
      allowedOrigins: ['https://allowed.com'],
    })
    const request = new Request('http://example.com', { method: 'POST' })
    const next = createNext()

    const response = await middleware(request, next)

    expect(next).not.toHaveBeenCalled()
    expect(response.status).toBe(403)
    const body = await response.json()
    expect(body.error).toContain('Missing Origin')
  })

  it('allows when rejectMissingOrigin is false', async () => {
    const middleware = originValidationMiddleware({
      allowedOrigins: ['https://allowed.com'],
      rejectMissingOrigin: false,
    })
    const request = new Request('http://example.com', { method: 'POST' })
    const next = createNext()

    await middleware(request, next)

    expect(next).toHaveBeenCalled()
  })

  it('allows request from allowed origin', async () => {
    const middleware = originValidationMiddleware({
      allowedOrigins: ['https://allowed.com'],
    })
    const request = new Request('http://example.com', {
      method: 'POST',
      headers: {
        Origin: 'https://allowed.com',
      },
    })
    const next = createNext()

    await middleware(request, next)

    expect(next).toHaveBeenCalled()
  })

  it('blocks request from disallowed origin', async () => {
    const middleware = originValidationMiddleware({
      allowedOrigins: ['https://allowed.com'],
    })
    const request = new Request('http://example.com', {
      method: 'POST',
      headers: {
        Origin: 'https://evil.com',
      },
    })
    const next = createNext()

    const response = await middleware(request, next)

    expect(next).not.toHaveBeenCalled()
    expect(response.status).toBe(403)
    const body = await response.json()
    expect(body.error).toContain('not allowed')
  })

  it('allows request from allowed host', async () => {
    const middleware = originValidationMiddleware({
      allowedHosts: ['example.com'],
    })
    const request = new Request('http://example.com', {
      method: 'POST',
      headers: {
        Origin: 'https://example.com',
      },
    })
    const next = createNext()

    await middleware(request, next)

    expect(next).toHaveBeenCalled()
  })

  it('allows subdomains when configured', async () => {
    const middleware = originValidationMiddleware({
      allowedHosts: ['example.com'],
      allowSubdomains: true,
    })
    const request = new Request('http://example.com', {
      method: 'POST',
      headers: {
        Origin: 'https://app.example.com',
      },
    })
    const next = createNext()

    await middleware(request, next)

    expect(next).toHaveBeenCalled()
  })

  it('blocks subdomains when not configured', async () => {
    const middleware = originValidationMiddleware({
      allowedHosts: ['example.com'],
      allowSubdomains: false,
    })
    const request = new Request('http://example.com', {
      method: 'POST',
      headers: {
        Origin: 'https://app.example.com',
      },
    })
    const next = createNext()

    const response = await middleware(request, next)

    expect(next).not.toHaveBeenCalled()
    expect(response.status).toBe(403)
  })

  it('skips excluded paths', async () => {
    const middleware = originValidationMiddleware({
      allowedOrigins: ['https://allowed.com'],
      excludePaths: ['/api/webhooks'],
    })
    const request = new Request('http://example.com/api/webhooks/stripe', {
      method: 'POST',
      headers: {
        Origin: 'https://evil.com',
      },
    })
    const next = createNext()

    await middleware(request, next)

    expect(next).toHaveBeenCalled()
  })

  it('falls back to Referer when Origin is missing', async () => {
    const middleware = originValidationMiddleware({
      allowedOrigins: ['https://allowed.com'],
    })
    const request = new Request('http://example.com', {
      method: 'POST',
      headers: {
        Referer: 'https://allowed.com/page',
      },
    })
    const next = createNext()

    await middleware(request, next)

    expect(next).toHaveBeenCalled()
  })

  it('validates PUT requests', async () => {
    const middleware = originValidationMiddleware({
      allowedOrigins: ['https://allowed.com'],
    })
    const request = new Request('http://example.com', {
      method: 'PUT',
      headers: {
        Origin: 'https://evil.com',
      },
    })
    const next = createNext()

    const response = await middleware(request, next)

    expect(next).not.toHaveBeenCalled()
    expect(response.status).toBe(403)
  })

  it('validates DELETE requests', async () => {
    const middleware = originValidationMiddleware({
      allowedOrigins: ['https://allowed.com'],
    })
    const request = new Request('http://example.com', {
      method: 'DELETE',
      headers: {
        Origin: 'https://evil.com',
      },
    })
    const next = createNext()

    const response = await middleware(request, next)

    expect(next).not.toHaveBeenCalled()
    expect(response.status).toBe(403)
  })
})
