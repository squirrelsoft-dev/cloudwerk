/**
 * @cloudwerk/security - CSP Tests
 */

import { describe, it, expect, vi } from 'vitest'
import { cspMiddleware, generateCSPHeader, generateNonce } from '../headers/csp.js'

describe('generateNonce', () => {
  it('generates a nonce', () => {
    const nonce = generateNonce()
    expect(nonce).toBeDefined()
    expect(typeof nonce).toBe('string')
    expect(nonce.length).toBeGreaterThan(10)
  })

  it('generates unique nonces', () => {
    const nonce1 = generateNonce()
    const nonce2 = generateNonce()
    expect(nonce1).not.toBe(nonce2)
  })
})

describe('generateCSPHeader', () => {
  it('generates empty string for empty directives', () => {
    const csp = generateCSPHeader({})
    expect(csp).toBe('')
  })

  it('generates single directive', () => {
    const csp = generateCSPHeader({
      defaultSrc: ["'self'"],
    })
    expect(csp).toBe("default-src 'self'")
  })

  it('generates multiple directives', () => {
    const csp = generateCSPHeader({
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", 'https://cdn.example.com'],
    })
    expect(csp).toContain("default-src 'self'")
    expect(csp).toContain("script-src 'self' https://cdn.example.com")
  })

  it('handles string directive value', () => {
    const csp = generateCSPHeader({
      defaultSrc: "'self'",
    })
    expect(csp).toBe("default-src 'self'")
  })

  it('handles boolean directives', () => {
    const csp = generateCSPHeader({
      upgradeInsecureRequests: true,
    })
    expect(csp).toBe('upgrade-insecure-requests')
  })

  it('skips false boolean directives', () => {
    const csp = generateCSPHeader({
      upgradeInsecureRequests: false,
    })
    expect(csp).toBe('')
  })

  it('skips undefined directives', () => {
    const csp = generateCSPHeader({
      defaultSrc: ["'self'"],
      scriptSrc: undefined,
    })
    expect(csp).toBe("default-src 'self'")
    expect(csp).not.toContain('script-src')
  })

  it('adds nonce to script-src', () => {
    const csp = generateCSPHeader(
      {
        scriptSrc: ["'self'"],
      },
      'abc123'
    )
    expect(csp).toBe("script-src 'self' 'nonce-abc123'")
  })

  it('adds nonce to style-src', () => {
    const csp = generateCSPHeader(
      {
        styleSrc: ["'self'"],
      },
      'abc123'
    )
    expect(csp).toBe("style-src 'self' 'nonce-abc123'")
  })
})

describe('cspMiddleware', () => {
  const createNext = (response = new Response('OK')) => vi.fn(() => Promise.resolve(response))

  it('sets CSP header', async () => {
    const middleware = cspMiddleware({
      directives: {
        defaultSrc: ["'self'"],
      },
    })
    const request = new Request('http://example.com')
    const next = createNext()

    const response = await middleware(request, next)

    expect(response.headers.get('Content-Security-Policy')).toBe("default-src 'self'")
  })

  it('uses report-only mode when configured', async () => {
    const middleware = cspMiddleware({
      directives: {
        defaultSrc: ["'self'"],
      },
      reportOnly: true,
    })
    const request = new Request('http://example.com')
    const next = createNext()

    const response = await middleware(request, next)

    expect(response.headers.get('Content-Security-Policy')).toBeNull()
    expect(response.headers.get('Content-Security-Policy-Report-Only')).toBe("default-src 'self'")
  })

  it('generates nonce when requested', async () => {
    const middleware = cspMiddleware({
      directives: {
        scriptSrc: ["'self'"],
      },
      useNonce: true,
    })
    const request = new Request('http://example.com')
    const next = createNext()

    const response = await middleware(request, next)

    const csp = response.headers.get('Content-Security-Policy')
    expect(csp).toMatch(/'nonce-[A-Za-z0-9+/=]+'/);

    // Nonce should be available via header
    const nonce = response.headers.get('X-CSP-Nonce')
    expect(nonce).toBeDefined()
  })

  it('does not set header if no directives', async () => {
    const middleware = cspMiddleware({
      directives: {},
    })
    const request = new Request('http://example.com')
    const next = createNext()

    const response = await middleware(request, next)

    expect(response.headers.get('Content-Security-Policy')).toBeNull()
  })

  it('preserves response status', async () => {
    const originalResponse = new Response('Created', { status: 201 })
    const middleware = cspMiddleware({
      directives: {
        defaultSrc: ["'self'"],
      },
    })
    const request = new Request('http://example.com')
    const next = createNext(originalResponse)

    const response = await middleware(request, next)

    expect(response.status).toBe(201)
  })
})
