import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { User, RBACConfig } from '../types.js'
import { authMiddleware } from '../middleware/auth.js'
import { AUTH_USER_KEY } from '../context.js'

// Mock context storage
const mockContextStore = new Map<string, unknown>()

vi.mock('@cloudwerk/core', () => ({
  getContext: () => ({
    get: <T>(key: string): T | undefined => mockContextStore.get(key) as T | undefined,
    set: <T>(key: string, value: T): void => {
      mockContextStore.set(key, value)
    },
    request: new Request('https://example.com/dashboard'),
  }),
}))

describe('Auth Middleware (Route Protection)', () => {
  const testUser: User<RBACConfig> = {
    id: 'user_1',
    email: 'test@example.com',
    emailVerified: new Date(),
    name: 'Test User',
    createdAt: new Date(),
    updatedAt: new Date(),
    data: {
      roles: ['editor', 'viewer'],
    },
  }

  const adminUser: User<RBACConfig> = {
    ...testUser,
    id: 'admin_1',
    data: {
      roles: ['admin', 'editor'],
    },
  }

  const createRequest = (path: string = '/protected'): Request => {
    return new Request(`https://example.com${path}`)
  }

  const next = async (): Promise<Response> => new Response('OK')

  beforeEach(() => {
    mockContextStore.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('authentication checks', () => {
    it('should redirect unauthenticated users to login', async () => {
      const middleware = authMiddleware()
      const request = createRequest('/protected')

      const response = await middleware(request, next)

      expect(response.status).toBe(302)
      const location = response.headers.get('Location')
      expect(location).toContain('/login')
      expect(location).toContain('returnTo=')
    })

    it('should include returnTo with full path', async () => {
      const middleware = authMiddleware()
      const request = createRequest('/protected?foo=bar')

      const response = await middleware(request, next)

      const location = response.headers.get('Location')
      expect(location).toContain(encodeURIComponent('/protected?foo=bar'))
    })

    it('should use custom unauthenticatedRedirect', async () => {
      const middleware = authMiddleware({
        unauthenticatedRedirect: '/auth/signin',
      })
      const request = createRequest('/protected')

      const response = await middleware(request, next)

      const location = response.headers.get('Location')
      expect(location).toContain('/auth/signin')
    })

    it('should return JSON 401 when json option is true', async () => {
      const middleware = authMiddleware({ json: true })
      const request = createRequest('/protected')

      const response = await middleware(request, next)

      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error).toBe('Authentication required')
    })

    it('should allow authenticated users through', async () => {
      mockContextStore.set(AUTH_USER_KEY, testUser)
      const middleware = authMiddleware()
      const request = createRequest('/protected')

      const response = await middleware(request, next)

      expect(response.status).toBe(200)
    })
  })

  describe('single role checks', () => {
    it('should allow user with required role', async () => {
      mockContextStore.set(AUTH_USER_KEY, testUser)
      const middleware = authMiddleware({ role: 'editor' })
      const request = createRequest('/protected')

      const response = await middleware(request, next)

      expect(response.status).toBe(200)
    })

    it('should reject user without required role with 403', async () => {
      mockContextStore.set(AUTH_USER_KEY, testUser)
      const middleware = authMiddleware({ role: 'admin' })
      const request = createRequest('/protected')

      const response = await middleware(request, next)

      expect(response.status).toBe(403)
    })

    it('should return JSON 403 for role rejection when json option is true', async () => {
      mockContextStore.set(AUTH_USER_KEY, testUser)
      const middleware = authMiddleware({ role: 'admin', json: true })
      const request = createRequest('/protected')

      const response = await middleware(request, next)

      expect(response.status).toBe(403)
      const body = await response.json()
      expect(body.error).toContain("Role 'admin' required")
      expect(body.required).toBe('admin')
    })

    it('should redirect to unauthorizedRedirect if set', async () => {
      mockContextStore.set(AUTH_USER_KEY, testUser)
      const middleware = authMiddleware({
        role: 'admin',
        unauthorizedRedirect: '/forbidden',
      })
      const request = createRequest('/protected')

      const response = await middleware(request, next)

      expect(response.status).toBe(302)
      const location = response.headers.get('Location')
      expect(location).toContain('/forbidden')
    })
  })

  describe('multiple roles checks', () => {
    it('should allow user with any of the required roles', async () => {
      mockContextStore.set(AUTH_USER_KEY, testUser)
      const middleware = authMiddleware({ roles: ['admin', 'editor'] })
      const request = createRequest('/protected')

      const response = await middleware(request, next)

      expect(response.status).toBe(200)
    })

    it('should reject user without any of the required roles', async () => {
      mockContextStore.set(AUTH_USER_KEY, testUser)
      const middleware = authMiddleware({ roles: ['admin', 'superuser'] })
      const request = createRequest('/protected')

      const response = await middleware(request, next)

      expect(response.status).toBe(403)
    })

    it('should include roles in error response', async () => {
      mockContextStore.set(AUTH_USER_KEY, testUser)
      const middleware = authMiddleware({
        roles: ['admin', 'superuser'],
        json: true,
      })
      const request = createRequest('/protected')

      const response = await middleware(request, next)

      const body = await response.json()
      expect(body.error).toContain('admin')
      expect(body.error).toContain('superuser')
    })
  })

  describe('custom authorization', () => {
    it('should call authorize with user and request', async () => {
      mockContextStore.set(AUTH_USER_KEY, testUser)
      const authorize = vi.fn().mockResolvedValue(true)
      const middleware = authMiddleware({ authorize })
      const request = createRequest('/protected')

      await middleware(request, next)

      expect(authorize).toHaveBeenCalledWith(testUser, request)
    })

    it('should allow when authorize returns true', async () => {
      mockContextStore.set(AUTH_USER_KEY, testUser)
      const authorize = vi.fn().mockResolvedValue(true)
      const middleware = authMiddleware({ authorize })
      const request = createRequest('/protected')

      const response = await middleware(request, next)

      expect(response.status).toBe(200)
    })

    it('should reject when authorize returns false', async () => {
      mockContextStore.set(AUTH_USER_KEY, testUser)
      const authorize = vi.fn().mockResolvedValue(false)
      const middleware = authMiddleware({ authorize })
      const request = createRequest('/protected')

      const response = await middleware(request, next)

      expect(response.status).toBe(403)
    })

    it('should run authorize after role checks pass', async () => {
      mockContextStore.set(AUTH_USER_KEY, testUser)
      const authorize = vi.fn().mockResolvedValue(true)
      const middleware = authMiddleware({
        role: 'editor',
        authorize,
      })
      const request = createRequest('/protected')

      await middleware(request, next)

      expect(authorize).toHaveBeenCalled()
    })

    it('should not run authorize if role check fails', async () => {
      mockContextStore.set(AUTH_USER_KEY, testUser)
      const authorize = vi.fn().mockResolvedValue(true)
      const middleware = authMiddleware({
        role: 'admin',
        authorize,
      })
      const request = createRequest('/protected')

      await middleware(request, next)

      expect(authorize).not.toHaveBeenCalled()
    })

    it('should support async authorize functions', async () => {
      mockContextStore.set(AUTH_USER_KEY, testUser)
      const authorize = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10))
        return true
      })
      const middleware = authMiddleware({ authorize })
      const request = createRequest('/protected')

      const response = await middleware(request, next)

      expect(response.status).toBe(200)
    })

    it('should support custom resource-based authorization', async () => {
      mockContextStore.set(AUTH_USER_KEY, {
        ...testUser,
        data: { resources: ['res_1', 'res_2'] },
      })
      const authorize = vi.fn().mockImplementation((user, request) => {
        const url = new URL(request.url)
        const resourceId = url.searchParams.get('resourceId')
        return (user as User<{ resources: string[] }>).data?.resources?.includes(
          resourceId!
        )
      })
      const middleware = authMiddleware({ authorize })

      // Allowed resource
      const request1 = createRequest('/protected?resourceId=res_1')
      const response1 = await middleware(request1, next)
      expect(response1.status).toBe(200)

      // Forbidden resource
      const request2 = createRequest('/protected?resourceId=res_999')
      const response2 = await middleware(request2, next)
      expect(response2.status).toBe(403)
    })
  })

  describe('combined checks', () => {
    it('should check auth, then role, then authorize', async () => {
      mockContextStore.set(AUTH_USER_KEY, adminUser)
      const authorize = vi.fn().mockResolvedValue(true)
      const middleware = authMiddleware({
        role: 'admin',
        authorize,
      })
      const request = createRequest('/protected')

      const response = await middleware(request, next)

      expect(response.status).toBe(200)
      expect(authorize).toHaveBeenCalled()
    })

    it('should fail fast on auth check', async () => {
      // No user set
      const authorize = vi.fn().mockResolvedValue(true)
      const middleware = authMiddleware({
        role: 'admin',
        authorize,
      })
      const request = createRequest('/protected')

      const response = await middleware(request, next)

      expect(response.status).toBe(302) // Redirect
      expect(authorize).not.toHaveBeenCalled()
    })

    it('should fail fast on role check', async () => {
      mockContextStore.set(AUTH_USER_KEY, testUser) // Has editor, not admin
      const authorize = vi.fn().mockResolvedValue(true)
      const middleware = authMiddleware({
        role: 'admin',
        authorize,
      })
      const request = createRequest('/protected')

      const response = await middleware(request, next)

      expect(response.status).toBe(403)
      expect(authorize).not.toHaveBeenCalled()
    })
  })
})
