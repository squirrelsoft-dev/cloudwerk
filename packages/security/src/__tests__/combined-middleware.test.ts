/**
 * @cloudwerk/security - Combined Middleware Tests
 */

import { describe, it, expect, vi } from 'vitest'
import { securityMiddleware } from '../combined/security-middleware.js'

describe('securityMiddleware', () => {
  const createNext = (response = new Response('OK')) => vi.fn(() => Promise.resolve(response))

  it('applies security headers by default', async () => {
    const middleware = securityMiddleware()
    const request = new Request('http://example.com')
    const next = createNext()

    const response = await middleware(request, next)

    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(response.headers.get('X-Frame-Options')).toBe('DENY')
  })

  it('can disable security headers', async () => {
    const middleware = securityMiddleware({
      headers: false,
    })
    const request = new Request('http://example.com')
    const next = createNext()

    const response = await middleware(request, next)

    expect(response.headers.get('X-Content-Type-Options')).toBeNull()
  })

  it('applies CSRF protection by default', async () => {
    const middleware = securityMiddleware()
    const request = new Request('http://example.com', { method: 'POST' })
    const next = createNext()

    const response = await middleware(request, next)

    expect(response.status).toBe(403) // Blocked due to missing CSRF
  })

  it('can disable CSRF protection', async () => {
    const middleware = securityMiddleware({
      csrf: false,
      requestedWith: false, // Also disable to isolate test
    })
    const request = new Request('http://example.com', { method: 'POST' })
    const next = createNext()

    await middleware(request, next)

    expect(next).toHaveBeenCalled()
  })

  it('applies X-Requested-With validation by default', async () => {
    const middleware = securityMiddleware({
      csrf: false, // Disable CSRF to test requestedWith
    })
    const request = new Request('http://example.com', { method: 'POST' })
    const next = createNext()

    const response = await middleware(request, next)

    expect(response.status).toBe(403) // Blocked due to missing X-Requested-With
  })

  it('can disable X-Requested-With validation', async () => {
    const middleware = securityMiddleware({
      csrf: false,
      requestedWith: false,
    })
    const request = new Request('http://example.com', { method: 'POST' })
    const next = createNext()

    await middleware(request, next)

    expect(next).toHaveBeenCalled()
  })

  it('does not apply origin validation by default', async () => {
    const middleware = securityMiddleware({
      csrf: false,
      requestedWith: false,
    })
    const request = new Request('http://example.com', {
      method: 'POST',
      headers: {
        Origin: 'https://evil.com',
      },
    })
    const next = createNext()

    await middleware(request, next)

    expect(next).toHaveBeenCalled()
  })

  it('applies origin validation when configured', async () => {
    const middleware = securityMiddleware({
      csrf: false,
      requestedWith: false,
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

    expect(response.status).toBe(403)
  })

  it('does not apply CSP by default', async () => {
    const middleware = securityMiddleware()
    const request = new Request('http://example.com')
    const next = createNext()

    const response = await middleware(request, next)

    expect(response.headers.get('Content-Security-Policy')).toBeNull()
  })

  it('applies CSP when configured', async () => {
    const middleware = securityMiddleware({
      csp: {
        directives: {
          defaultSrc: ["'self'"],
        },
      },
    })
    const request = new Request('http://example.com')
    const next = createNext()

    const response = await middleware(request, next)

    expect(response.headers.get('Content-Security-Policy')).toBe("default-src 'self'")
  })

  it('allows all protections with valid request', async () => {
    const middleware = securityMiddleware({
      allowedOrigins: ['https://example.com'],
    })
    const request = new Request('http://example.com', {
      method: 'POST',
      headers: {
        Cookie: 'cloudwerk.csrf-token=token123',
        'X-CSRF-Token': 'token123',
        'X-Requested-With': 'XMLHttpRequest',
        Origin: 'https://example.com',
      },
    })
    const next = createNext()

    await middleware(request, next)

    expect(next).toHaveBeenCalled()
  })

  it('passes through when all protections are disabled', async () => {
    const middleware = securityMiddleware({
      csrf: false,
      requestedWith: false,
      headers: false,
      csp: false,
      origin: false,
    })
    const request = new Request('http://example.com', { method: 'POST' })
    const next = createNext()

    const response = await middleware(request, next)

    expect(next).toHaveBeenCalled()
    expect(response.headers.get('X-Content-Type-Options')).toBeNull()
  })
})
