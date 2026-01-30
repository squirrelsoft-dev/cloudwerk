import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  csrfMiddleware,
  generateCsrfToken,
  setCsrfCookie,
} from '../middleware/csrf.js'

describe('CSRF Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generateCsrfToken', () => {
    it('should generate a token string', () => {
      const token = generateCsrfToken()
      expect(typeof token).toBe('string')
    })

    it('should generate tokens of consistent length', () => {
      const token1 = generateCsrfToken()
      const token2 = generateCsrfToken()

      // 32 bytes base64 encoded = 43 characters (without padding)
      expect(token1.length).toBe(43)
      expect(token2.length).toBe(43)
    })

    it('should generate unique tokens', () => {
      const tokens = new Set<string>()
      for (let i = 0; i < 100; i++) {
        tokens.add(generateCsrfToken())
      }
      expect(tokens.size).toBe(100)
    })

    it('should generate URL-safe tokens', () => {
      const token = generateCsrfToken()
      expect(token).not.toMatch(/[+/=]/)
    })
  })

  describe('setCsrfCookie', () => {
    it('should add Set-Cookie header to response', () => {
      const token = 'test-token-123'
      const originalResponse = new Response('OK')
      const response = setCsrfCookie(originalResponse, token)

      const setCookie = response.headers.get('Set-Cookie')
      expect(setCookie).toContain('cloudwerk.csrf-token=test-token-123')
    })

    it('should set secure defaults', () => {
      const token = 'test-token-123'
      const response = setCsrfCookie(new Response('OK'), token)

      const setCookie = response.headers.get('Set-Cookie')
      expect(setCookie).toContain('Secure')
      expect(setCookie).toContain('SameSite=Lax')
      expect(setCookie).toContain('Path=/')
    })

    it('should NOT set HttpOnly (to allow JS access)', () => {
      const token = 'test-token-123'
      const response = setCsrfCookie(new Response('OK'), token)

      const setCookie = response.headers.get('Set-Cookie')
      expect(setCookie).not.toContain('HttpOnly')
    })

    it('should use custom cookie name', () => {
      const token = 'test-token-123'
      const response = setCsrfCookie(new Response('OK'), token, {
        cookieName: 'my-csrf',
      })

      const setCookie = response.headers.get('Set-Cookie')
      expect(setCookie).toContain('my-csrf=test-token-123')
    })

    it('should preserve original response body and status', () => {
      const token = 'test-token-123'
      const originalResponse = new Response('Original body', { status: 201 })
      const response = setCsrfCookie(originalResponse, token)

      expect(response.status).toBe(201)
    })
  })

  describe('csrfMiddleware', () => {
    const createRequest = (
      method: string,
      options: {
        cookieToken?: string
        headerToken?: string
        cookieName?: string
        headerName?: string
        path?: string
        formBody?: FormData
        contentType?: string
      } = {}
    ): Request => {
      const headers = new Headers()

      if (options.cookieToken) {
        const cookieName = options.cookieName ?? 'cloudwerk.csrf-token'
        headers.set('Cookie', `${cookieName}=${options.cookieToken}`)
      }

      if (options.headerToken) {
        const headerName = options.headerName ?? 'X-CSRF-Token'
        headers.set(headerName, options.headerToken)
      }

      if (options.contentType) {
        headers.set('Content-Type', options.contentType)
      }

      const url = `https://example.com${options.path ?? '/api/data'}`

      return new Request(url, {
        method,
        headers,
        body: options.formBody,
      })
    }

    const next = async (): Promise<Response> => new Response('OK')

    describe('safe methods', () => {
      it('should skip GET requests', async () => {
        const middleware = csrfMiddleware()
        const request = createRequest('GET')

        const response = await middleware(request, next)

        expect(response.status).toBe(200)
      })

      it('should skip HEAD requests', async () => {
        const middleware = csrfMiddleware()
        const request = createRequest('HEAD')

        const response = await middleware(request, next)

        expect(response.status).toBe(200)
      })

      it('should skip OPTIONS requests', async () => {
        const middleware = csrfMiddleware()
        const request = createRequest('OPTIONS')

        const response = await middleware(request, next)

        expect(response.status).toBe(200)
      })
    })

    describe('mutation methods', () => {
      it('should reject POST without cookie token', async () => {
        const middleware = csrfMiddleware()
        const request = createRequest('POST', { headerToken: 'valid-token' })

        const response = await middleware(request, next)

        expect(response.status).toBe(403)
        const body = await response.json()
        expect(body.error).toContain('Missing CSRF token cookie')
      })

      it('should reject POST without header token', async () => {
        const middleware = csrfMiddleware()
        const request = createRequest('POST', { cookieToken: 'valid-token' })

        const response = await middleware(request, next)

        expect(response.status).toBe(403)
        const body = await response.json()
        expect(body.error).toContain('Missing CSRF token in request')
      })

      it('should reject POST with mismatched tokens', async () => {
        const middleware = csrfMiddleware()
        const request = createRequest('POST', {
          cookieToken: 'cookie-token',
          headerToken: 'different-token',
        })

        const response = await middleware(request, next)

        expect(response.status).toBe(403)
        const body = await response.json()
        expect(body.error).toContain('Invalid CSRF token')
      })

      it('should allow POST with matching tokens', async () => {
        const middleware = csrfMiddleware()
        const token = 'matching-token-123'
        const request = createRequest('POST', {
          cookieToken: token,
          headerToken: token,
        })

        const response = await middleware(request, next)

        expect(response.status).toBe(200)
      })

      it('should validate PUT requests', async () => {
        const middleware = csrfMiddleware()
        const token = 'valid-token'
        const request = createRequest('PUT', {
          cookieToken: token,
          headerToken: token,
        })

        const response = await middleware(request, next)

        expect(response.status).toBe(200)
      })

      it('should validate PATCH requests', async () => {
        const middleware = csrfMiddleware()
        const token = 'valid-token'
        const request = createRequest('PATCH', {
          cookieToken: token,
          headerToken: token,
        })

        const response = await middleware(request, next)

        expect(response.status).toBe(200)
      })

      it('should validate DELETE requests', async () => {
        const middleware = csrfMiddleware()
        const token = 'valid-token'
        const request = createRequest('DELETE', {
          cookieToken: token,
          headerToken: token,
        })

        const response = await middleware(request, next)

        expect(response.status).toBe(200)
      })
    })

    describe('custom configuration', () => {
      it('should use custom cookie name', async () => {
        const middleware = csrfMiddleware({ cookieName: 'my-csrf' })
        const token = 'valid-token'
        const request = createRequest('POST', {
          cookieToken: token,
          headerToken: token,
          cookieName: 'my-csrf',
        })

        const response = await middleware(request, next)

        expect(response.status).toBe(200)
      })

      it('should use custom header name', async () => {
        const middleware = csrfMiddleware({ headerName: 'X-My-CSRF' })
        const token = 'valid-token'
        const request = createRequest('POST', {
          cookieToken: token,
          headerToken: token,
          headerName: 'X-My-CSRF',
        })

        const response = await middleware(request, next)

        expect(response.status).toBe(200)
      })

      it('should use custom methods list', async () => {
        const middleware = csrfMiddleware({ methods: ['POST'] })

        // DELETE should be allowed without CSRF
        const deleteRequest = createRequest('DELETE')
        const deleteResponse = await middleware(deleteRequest, next)
        expect(deleteResponse.status).toBe(200)

        // POST should still require CSRF
        const postRequest = createRequest('POST')
        const postResponse = await middleware(postRequest, next)
        expect(postResponse.status).toBe(403)
      })
    })

    describe('excluded paths', () => {
      it('should skip excluded paths', async () => {
        const middleware = csrfMiddleware({
          excludePaths: ['/api/webhooks'],
        })
        const request = createRequest('POST', { path: '/api/webhooks/stripe' })

        const response = await middleware(request, next)

        expect(response.status).toBe(200)
      })

      it('should not skip non-excluded paths', async () => {
        const middleware = csrfMiddleware({
          excludePaths: ['/api/webhooks'],
        })
        const request = createRequest('POST', { path: '/api/users' })

        const response = await middleware(request, next)

        expect(response.status).toBe(403)
      })

      it('should match path prefix', async () => {
        const middleware = csrfMiddleware({
          excludePaths: ['/api/webhooks'],
        })

        // Should match anything starting with /api/webhooks
        const request1 = createRequest('POST', { path: '/api/webhooks/github/events' })
        const response1 = await middleware(request1, next)
        expect(response1.status).toBe(200)

        // Should not match similar but different paths
        const request2 = createRequest('POST', { path: '/api/webhook' })
        const response2 = await middleware(request2, next)
        expect(response2.status).toBe(403)
      })
    })

    describe('form body token', () => {
      it('should accept token from form body', async () => {
        const middleware = csrfMiddleware()
        const token = 'form-token-123'

        const formData = new FormData()
        formData.set('csrf_token', token)
        formData.set('name', 'Test')

        const headers = new Headers()
        headers.set('Cookie', `cloudwerk.csrf-token=${token}`)

        const request = new Request('https://example.com/api/data', {
          method: 'POST',
          headers,
          body: formData,
        })

        const response = await middleware(request, next)

        expect(response.status).toBe(200)
      })
    })
  })
})
