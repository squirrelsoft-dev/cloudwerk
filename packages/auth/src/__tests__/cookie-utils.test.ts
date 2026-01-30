import { describe, it, expect } from 'vitest'
import {
  parseCookies,
  serializeCookie,
  getSessionFromCookie,
  setSessionCookie,
  clearSessionCookie,
} from '../session/cookie-utils.js'

describe('parseCookies', () => {
  it('parses a single cookie', () => {
    const result = parseCookies('session=abc123')
    expect(result).toEqual({ session: 'abc123' })
  })

  it('parses multiple cookies', () => {
    const result = parseCookies('session=abc123; theme=dark; lang=en')
    expect(result).toEqual({
      session: 'abc123',
      theme: 'dark',
      lang: 'en',
    })
  })

  it('handles cookies with spaces around values', () => {
    const result = parseCookies('session = abc123 ; theme = dark')
    expect(result).toEqual({
      session: 'abc123',
      theme: 'dark',
    })
  })

  it('handles quoted values', () => {
    const result = parseCookies('session="abc123"')
    expect(result).toEqual({ session: 'abc123' })
  })

  it('handles values containing equals signs', () => {
    const result = parseCookies('data=key=value=more')
    expect(result).toEqual({ data: 'key=value=more' })
  })

  it('returns empty object for empty string', () => {
    const result = parseCookies('')
    expect(result).toEqual({})
  })

  it('ignores empty cookie names', () => {
    const result = parseCookies('=value; session=abc')
    expect(result).toEqual({ session: 'abc' })
  })
})

describe('serializeCookie', () => {
  it('serializes a basic cookie', () => {
    const result = serializeCookie('session', 'abc123')
    expect(result).toBe('session=abc123')
  })

  it('includes all attributes', () => {
    const result = serializeCookie('session', 'abc123', {
      domain: 'example.com',
      path: '/',
      secure: true,
      httpOnly: true,
      sameSite: 'strict',
      maxAge: 3600,
    })

    expect(result).toContain('session=abc123')
    expect(result).toContain('Domain=example.com')
    expect(result).toContain('Path=/')
    expect(result).toContain('Secure')
    expect(result).toContain('HttpOnly')
    expect(result).toContain('SameSite=Strict')
    expect(result).toContain('Max-Age=3600')
  })

  it('capitalizes sameSite value', () => {
    expect(serializeCookie('s', 'v', { sameSite: 'lax' })).toContain('SameSite=Lax')
    expect(serializeCookie('s', 'v', { sameSite: 'strict' })).toContain('SameSite=Strict')
    expect(serializeCookie('s', 'v', { sameSite: 'none' })).toContain('SameSite=None')
  })

  it('includes expires as UTC string', () => {
    const date = new Date('2024-01-15T12:00:00Z')
    const result = serializeCookie('session', 'abc', { expires: date })
    expect(result).toContain('Expires=Mon, 15 Jan 2024 12:00:00 GMT')
  })

  it('encodes special characters in name and value', () => {
    const result = serializeCookie('my session', 'value=with;special')
    expect(result).toBe('my%20session=value%3Dwith%3Bspecial')
  })
})

describe('getSessionFromCookie', () => {
  it('extracts session token from request', () => {
    const request = new Request('https://example.com', {
      headers: { Cookie: 'cloudwerk.session-token=mytoken123' },
    })
    const result = getSessionFromCookie(request)
    expect(result).toBe('mytoken123')
  })

  it('returns null if cookie not found', () => {
    const request = new Request('https://example.com', {
      headers: { Cookie: 'other=value' },
    })
    const result = getSessionFromCookie(request)
    expect(result).toBeNull()
  })

  it('returns null if no cookie header', () => {
    const request = new Request('https://example.com')
    const result = getSessionFromCookie(request)
    expect(result).toBeNull()
  })

  it('uses custom cookie name from config', () => {
    const request = new Request('https://example.com', {
      headers: { Cookie: 'my-session=customtoken' },
    })
    const result = getSessionFromCookie(request, { name: 'my-session' })
    expect(result).toBe('customtoken')
  })
})

describe('setSessionCookie', () => {
  it('adds Set-Cookie header to response', () => {
    const response = new Response('OK')
    const result = setSessionCookie(response, 'token123')

    const setCookie = result.headers.get('Set-Cookie')
    expect(setCookie).toContain('cloudwerk.session-token=token123')
    expect(setCookie).toContain('HttpOnly')
    expect(setCookie).toContain('Secure')
    expect(setCookie).toContain('SameSite=Lax')
    expect(setCookie).toContain('Path=/')
  })

  it('uses custom cookie name', () => {
    const response = new Response('OK')
    const result = setSessionCookie(response, 'token123', { name: 'my-session' })

    const setCookie = result.headers.get('Set-Cookie')
    expect(setCookie).toContain('my-session=token123')
  })

  it('includes maxAge when provided', () => {
    const response = new Response('OK')
    const result = setSessionCookie(response, 'token123', { maxAge: 3600 })

    const setCookie = result.headers.get('Set-Cookie')
    expect(setCookie).toContain('Max-Age=3600')
  })

  it('preserves response body and status', () => {
    const response = new Response('Created', { status: 201 })
    const result = setSessionCookie(response, 'token123')

    expect(result.status).toBe(201)
  })

  it('merges custom attributes with defaults', () => {
    const response = new Response('OK')
    const result = setSessionCookie(response, 'token123', {
      attributes: { domain: 'example.com', secure: false },
    })

    const setCookie = result.headers.get('Set-Cookie')
    expect(setCookie).toContain('Domain=example.com')
    expect(setCookie).toContain('HttpOnly') // Default preserved
    expect(setCookie).not.toContain('Secure') // Overridden
  })
})

describe('clearSessionCookie', () => {
  it('sets empty cookie with immediate expiration', () => {
    const response = new Response('OK')
    const result = clearSessionCookie(response)

    const setCookie = result.headers.get('Set-Cookie')
    expect(setCookie).toContain('cloudwerk.session-token=')
    expect(setCookie).toContain('Max-Age=0')
    expect(setCookie).toContain('Expires=Thu, 01 Jan 1970 00:00:00 GMT')
  })

  it('uses custom cookie name', () => {
    const response = new Response('OK')
    const result = clearSessionCookie(response, { name: 'my-session' })

    const setCookie = result.headers.get('Set-Cookie')
    expect(setCookie).toContain('my-session=')
  })

  it('preserves response body and status', () => {
    const response = new Response('Logged out', { status: 200 })
    const result = clearSessionCookie(response)

    expect(result.status).toBe(200)
  })
})
