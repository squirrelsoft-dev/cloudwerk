/**
 * @cloudwerk/security - CSRF Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  csrfMiddleware,
  generateCsrfToken,
  setCsrfCookie,
  verifyCsrfToken,
  rotateCsrfToken,
  getCsrfTokenFromCookie,
  getCsrfTokenFromHeader,
  DEFAULT_CSRF_COOKIE_NAME,
  DEFAULT_CSRF_HEADER_NAME,
} from '../csrf/index.js'

describe('CSRF Token Generation', () => {
  it('generates a token', () => {
    const token = generateCsrfToken()
    expect(token).toBeDefined()
    expect(typeof token).toBe('string')
    expect(token.length).toBeGreaterThan(20) // Base64 encoded 32 bytes
  })

  it('generates unique tokens', () => {
    const token1 = generateCsrfToken()
    const token2 = generateCsrfToken()
    expect(token1).not.toBe(token2)
  })

  it('generates URL-safe tokens', () => {
    const token = generateCsrfToken()
    expect(token).not.toMatch(/[+/=]/)
  })
})

describe('CSRF Cookie', () => {
  it('sets CSRF cookie on response', () => {
    const response = new Response('OK')
    const token = 'test-token'

    const result = setCsrfCookie(response, token)

    const setCookie = result.headers.get('Set-Cookie')
    expect(setCookie).toContain(`${DEFAULT_CSRF_COOKIE_NAME}=test-token`)
    expect(setCookie).toContain('Path=/')
    expect(setCookie).toContain('SameSite=Lax')
    expect(setCookie).toContain('Secure')
    expect(setCookie).not.toContain('HttpOnly') // Must be readable by JS
  })

  it('uses custom cookie name', () => {
    const response = new Response('OK')
    const token = 'test-token'

    const result = setCsrfCookie(response, token, { cookieName: 'my-csrf' })

    const setCookie = result.headers.get('Set-Cookie')
    expect(setCookie).toContain('my-csrf=test-token')
  })

  it('respects secure option', () => {
    const response = new Response('OK')
    const token = 'test-token'

    const result = setCsrfCookie(response, token, { secure: false })

    const setCookie = result.headers.get('Set-Cookie')
    expect(setCookie).not.toContain('Secure')
  })
})

describe('getCsrfTokenFromCookie', () => {
  it('extracts token from cookie header', () => {
    const request = new Request('http://example.com', {
      headers: {
        Cookie: `${DEFAULT_CSRF_COOKIE_NAME}=my-token; other=value`,
      },
    })

    const token = getCsrfTokenFromCookie(request)
    expect(token).toBe('my-token')
  })

  it('returns null when cookie is missing', () => {
    const request = new Request('http://example.com', {
      headers: {
        Cookie: 'other=value',
      },
    })

    const token = getCsrfTokenFromCookie(request)
    expect(token).toBeNull()
  })

  it('returns null when no cookies', () => {
    const request = new Request('http://example.com')
    const token = getCsrfTokenFromCookie(request)
    expect(token).toBeNull()
  })
})

describe('getCsrfTokenFromHeader', () => {
  it('extracts token from header', () => {
    const request = new Request('http://example.com', {
      headers: {
        [DEFAULT_CSRF_HEADER_NAME]: 'my-token',
      },
    })

    const token = getCsrfTokenFromHeader(request)
    expect(token).toBe('my-token')
  })

  it('returns null when header is missing', () => {
    const request = new Request('http://example.com')
    const token = getCsrfTokenFromHeader(request)
    expect(token).toBeNull()
  })
})

describe('verifyCsrfToken', () => {
  it('returns true for matching tokens', () => {
    expect(verifyCsrfToken('token123', 'token123')).toBe(true)
  })

  it('returns false for non-matching tokens', () => {
    expect(verifyCsrfToken('token123', 'different')).toBe(false)
  })

  it('returns false for different length tokens', () => {
    expect(verifyCsrfToken('short', 'longertoken')).toBe(false)
  })
})

describe('rotateCsrfToken', () => {
  it('sets new token on response', () => {
    const response = new Response('OK')
    const result = rotateCsrfToken(response)

    const setCookie = result.headers.get('Set-Cookie')
    expect(setCookie).toContain(DEFAULT_CSRF_COOKIE_NAME)
    expect(setCookie).toContain('=') // Has a value
  })
})

describe('csrfMiddleware', () => {
  const createNext = (response = new Response('OK')) => vi.fn(() => Promise.resolve(response))

  it('allows GET requests without validation', async () => {
    const middleware = csrfMiddleware()
    const request = new Request('http://example.com')
    const next = createNext()

    await middleware(request, next)

    expect(next).toHaveBeenCalled()
  })

  it('allows HEAD requests without validation', async () => {
    const middleware = csrfMiddleware()
    const request = new Request('http://example.com', { method: 'HEAD' })
    const next = createNext()

    await middleware(request, next)

    expect(next).toHaveBeenCalled()
  })

  it('allows OPTIONS requests without validation', async () => {
    const middleware = csrfMiddleware()
    const request = new Request('http://example.com', { method: 'OPTIONS' })
    const next = createNext()

    await middleware(request, next)

    expect(next).toHaveBeenCalled()
  })

  it('blocks POST without CSRF cookie', async () => {
    const middleware = csrfMiddleware()
    const request = new Request('http://example.com', { method: 'POST' })
    const next = createNext()

    const response = await middleware(request, next)

    expect(next).not.toHaveBeenCalled()
    expect(response.status).toBe(403)
    const body = await response.json()
    expect(body.error).toContain('cookie')
  })

  it('blocks POST with cookie but no header', async () => {
    const middleware = csrfMiddleware()
    const request = new Request('http://example.com', {
      method: 'POST',
      headers: {
        Cookie: `${DEFAULT_CSRF_COOKIE_NAME}=token123`,
      },
    })
    const next = createNext()

    const response = await middleware(request, next)

    expect(next).not.toHaveBeenCalled()
    expect(response.status).toBe(403)
    const body = await response.json()
    expect(body.error).toContain('request')
  })

  it('blocks POST with mismatched tokens', async () => {
    const middleware = csrfMiddleware()
    const request = new Request('http://example.com', {
      method: 'POST',
      headers: {
        Cookie: `${DEFAULT_CSRF_COOKIE_NAME}=token123`,
        [DEFAULT_CSRF_HEADER_NAME]: 'different',
      },
    })
    const next = createNext()

    const response = await middleware(request, next)

    expect(next).not.toHaveBeenCalled()
    expect(response.status).toBe(403)
    const body = await response.json()
    expect(body.error).toContain('Invalid')
  })

  it('allows POST with matching tokens', async () => {
    const middleware = csrfMiddleware()
    const request = new Request('http://example.com', {
      method: 'POST',
      headers: {
        Cookie: `${DEFAULT_CSRF_COOKIE_NAME}=token123`,
        [DEFAULT_CSRF_HEADER_NAME]: 'token123',
      },
    })
    const next = createNext()

    await middleware(request, next)

    expect(next).toHaveBeenCalled()
  })

  it('skips excluded paths', async () => {
    const middleware = csrfMiddleware({
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
    const middleware = csrfMiddleware()
    const request = new Request('http://example.com', { method: 'PUT' })
    const next = createNext()

    const response = await middleware(request, next)

    expect(next).not.toHaveBeenCalled()
    expect(response.status).toBe(403)
  })

  it('validates DELETE requests', async () => {
    const middleware = csrfMiddleware()
    const request = new Request('http://example.com', { method: 'DELETE' })
    const next = createNext()

    const response = await middleware(request, next)

    expect(next).not.toHaveBeenCalled()
    expect(response.status).toBe(403)
  })

  it('validates PATCH requests', async () => {
    const middleware = csrfMiddleware()
    const request = new Request('http://example.com', { method: 'PATCH' })
    const next = createNext()

    const response = await middleware(request, next)

    expect(next).not.toHaveBeenCalled()
    expect(response.status).toBe(403)
  })

  it('accepts token from form body', async () => {
    const middleware = csrfMiddleware()
    const formData = new URLSearchParams()
    formData.append('csrf_token', 'token123')

    const request = new Request('http://example.com', {
      method: 'POST',
      headers: {
        Cookie: `${DEFAULT_CSRF_COOKIE_NAME}=token123`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    })
    const next = createNext()

    await middleware(request, next)

    expect(next).toHaveBeenCalled()
  })
})
