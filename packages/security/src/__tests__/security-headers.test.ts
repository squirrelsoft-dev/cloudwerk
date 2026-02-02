/**
 * @cloudwerk/security - Security Headers Tests
 */

import { describe, it, expect, vi } from 'vitest'
import { securityHeadersMiddleware } from '../headers/security-headers.js'

describe('securityHeadersMiddleware', () => {
  const createNext = (response = new Response('OK')) => vi.fn(() => Promise.resolve(response))

  it('sets default security headers', async () => {
    const middleware = securityHeadersMiddleware()
    const request = new Request('http://example.com')
    const next = createNext()

    const response = await middleware(request, next)

    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(response.headers.get('X-Frame-Options')).toBe('DENY')
    expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
    expect(response.headers.get('X-XSS-Protection')).toBe('0')
    expect(response.headers.get('X-Permitted-Cross-Domain-Policies')).toBe('none')
    expect(response.headers.get('X-DNS-Prefetch-Control')).toBe('off')
  })

  it('allows custom content type options', async () => {
    const middleware = securityHeadersMiddleware({
      contentTypeOptions: false,
    })
    const request = new Request('http://example.com')
    const next = createNext()

    const response = await middleware(request, next)

    expect(response.headers.get('X-Content-Type-Options')).toBeNull()
  })

  it('allows SAMEORIGIN frame options', async () => {
    const middleware = securityHeadersMiddleware({
      frameOptions: 'SAMEORIGIN',
    })
    const request = new Request('http://example.com')
    const next = createNext()

    const response = await middleware(request, next)

    expect(response.headers.get('X-Frame-Options')).toBe('SAMEORIGIN')
  })

  it('can disable frame options', async () => {
    const middleware = securityHeadersMiddleware({
      frameOptions: false,
    })
    const request = new Request('http://example.com')
    const next = createNext()

    const response = await middleware(request, next)

    expect(response.headers.get('X-Frame-Options')).toBeNull()
  })

  it('allows custom referrer policy', async () => {
    const middleware = securityHeadersMiddleware({
      referrerPolicy: 'no-referrer',
    })
    const request = new Request('http://example.com')
    const next = createNext()

    const response = await middleware(request, next)

    expect(response.headers.get('Referrer-Policy')).toBe('no-referrer')
  })

  it('sets COOP when configured', async () => {
    const middleware = securityHeadersMiddleware({
      crossOriginOpenerPolicy: 'same-origin',
    })
    const request = new Request('http://example.com')
    const next = createNext()

    const response = await middleware(request, next)

    expect(response.headers.get('Cross-Origin-Opener-Policy')).toBe('same-origin')
  })

  it('sets COEP when configured', async () => {
    const middleware = securityHeadersMiddleware({
      crossOriginEmbedderPolicy: 'require-corp',
    })
    const request = new Request('http://example.com')
    const next = createNext()

    const response = await middleware(request, next)

    expect(response.headers.get('Cross-Origin-Embedder-Policy')).toBe('require-corp')
  })

  it('sets CORP when configured', async () => {
    const middleware = securityHeadersMiddleware({
      crossOriginResourcePolicy: 'same-origin',
    })
    const request = new Request('http://example.com')
    const next = createNext()

    const response = await middleware(request, next)

    expect(response.headers.get('Cross-Origin-Resource-Policy')).toBe('same-origin')
  })

  it('preserves existing response headers', async () => {
    const originalResponse = new Response('OK', {
      headers: { 'X-Custom-Header': 'custom-value' },
    })
    const middleware = securityHeadersMiddleware()
    const request = new Request('http://example.com')
    const next = createNext(originalResponse)

    const response = await middleware(request, next)

    expect(response.headers.get('X-Custom-Header')).toBe('custom-value')
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
  })

  it('preserves response status', async () => {
    const originalResponse = new Response('Not Found', { status: 404 })
    const middleware = securityHeadersMiddleware()
    const request = new Request('http://example.com')
    const next = createNext(originalResponse)

    const response = await middleware(request, next)

    expect(response.status).toBe(404)
  })
})
