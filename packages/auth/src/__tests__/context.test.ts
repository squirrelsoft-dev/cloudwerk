import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { User, Session, RBACConfig, AuthConfig } from '../types.js'
import { ForbiddenError, UnauthenticatedError } from '../errors.js'
import {
  getUser,
  getSession,
  isAuthenticated,
  hasRole,
  hasPermission,
  getAuthContext,
  requireAuth,
  requireRole,
  requireAnyRole,
  requirePermission,
  setAuthContext,
  setAuthConfig,
  AUTH_USER_KEY,
  AUTH_SESSION_KEY,
  AUTH_CONFIG_KEY,
} from '../context.js'

// Mock @cloudwerk/core's getContext
const mockContextStore = new Map<string, unknown>()
const mockRequest = new Request('https://example.com/dashboard')

// Define the mock RedirectError outside of vi.mock for hoisting issues
const mockRedirectErrors: Array<{ url: string; status: number }> = []

vi.mock('@cloudwerk/core', () => ({
  getContext: () => ({
    get: <T>(key: string): T | undefined => mockContextStore.get(key) as T | undefined,
    set: <T>(key: string, value: T): void => {
      mockContextStore.set(key, value)
    },
    request: mockRequest,
  }),
  RedirectError: class RedirectError extends Error {
    readonly name = 'RedirectError' as const
    readonly url: string
    readonly status: number

    constructor(url: string, status: number = 302) {
      super(`Redirect to ${url}`)
      this.url = url
      this.status = status
      mockRedirectErrors.push({ url, status })
    }
  },
}))

describe('Auth Context Helpers', () => {
  const testUser: User<RBACConfig> = {
    id: 'user_1',
    email: 'test@example.com',
    emailVerified: new Date(),
    name: 'Test User',
    createdAt: new Date(),
    updatedAt: new Date(),
    data: {
      roles: ['editor', 'viewer'],
      permissions: ['posts:create'],
      rolePermissions: {
        editor: ['posts:edit', 'posts:publish'],
        admin: ['users:manage', 'settings:edit'],
      },
    },
  }

  const testSession: Session = {
    id: 'sess_1',
    userId: 'user_1',
    sessionToken: 'token_abc',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  beforeEach(() => {
    mockContextStore.clear()
    mockRedirectErrors.length = 0
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('getUser', () => {
    it('should return null when no user is set', () => {
      expect(getUser()).toBeNull()
    })

    it('should return the user when set', () => {
      mockContextStore.set(AUTH_USER_KEY, testUser)

      const user = getUser()
      expect(user).toEqual(testUser)
    })

    it('should return typed user', () => {
      mockContextStore.set(AUTH_USER_KEY, testUser)

      const user = getUser<User<RBACConfig>>()
      expect(user?.data?.roles).toContain('editor')
    })
  })

  describe('getSession', () => {
    it('should return null when no session is set', () => {
      expect(getSession()).toBeNull()
    })

    it('should return the session when set', () => {
      mockContextStore.set(AUTH_SESSION_KEY, testSession)

      const session = getSession()
      expect(session).toEqual(testSession)
    })
  })

  describe('isAuthenticated', () => {
    it('should return false when no user', () => {
      expect(isAuthenticated()).toBe(false)
    })

    it('should return true when user exists', () => {
      mockContextStore.set(AUTH_USER_KEY, testUser)

      expect(isAuthenticated()).toBe(true)
    })
  })

  describe('hasRole', () => {
    it('should return false when no user', () => {
      expect(hasRole('editor')).toBe(false)
    })

    it('should return false when user has no roles', () => {
      const userNoRoles: User = { ...testUser, data: undefined }
      mockContextStore.set(AUTH_USER_KEY, userNoRoles)

      expect(hasRole('editor')).toBe(false)
    })

    it('should return true when user has the role', () => {
      mockContextStore.set(AUTH_USER_KEY, testUser)

      expect(hasRole('editor')).toBe(true)
      expect(hasRole('viewer')).toBe(true)
    })

    it('should return false when user does not have the role', () => {
      mockContextStore.set(AUTH_USER_KEY, testUser)

      expect(hasRole('admin')).toBe(false)
    })
  })

  describe('hasPermission', () => {
    it('should return false when no user', () => {
      expect(hasPermission('posts:create')).toBe(false)
    })

    it('should return false when user has no data', () => {
      const userNoData: User = { ...testUser, data: undefined }
      mockContextStore.set(AUTH_USER_KEY, userNoData)

      expect(hasPermission('posts:create')).toBe(false)
    })

    it('should return true for direct permissions', () => {
      mockContextStore.set(AUTH_USER_KEY, testUser)

      expect(hasPermission('posts:create')).toBe(true)
    })

    it('should return true for role-based permissions', () => {
      mockContextStore.set(AUTH_USER_KEY, testUser)

      // editor role has posts:edit and posts:publish
      expect(hasPermission('posts:edit')).toBe(true)
      expect(hasPermission('posts:publish')).toBe(true)
    })

    it('should return false for permissions user does not have', () => {
      mockContextStore.set(AUTH_USER_KEY, testUser)

      // admin permissions should not be accessible
      expect(hasPermission('users:manage')).toBe(false)
      expect(hasPermission('settings:edit')).toBe(false)
    })
  })

  describe('getAuthContext', () => {
    it('should return unauthenticated context when no user', () => {
      const ctx = getAuthContext()

      expect(ctx.user).toBeNull()
      expect(ctx.session).toBeNull()
      expect(ctx.isAuthenticated).toBe(false)
    })

    it('should return authenticated context when user exists', () => {
      mockContextStore.set(AUTH_USER_KEY, testUser)
      mockContextStore.set(AUTH_SESSION_KEY, testSession)

      const ctx = getAuthContext()

      expect(ctx.user).toEqual(testUser)
      expect(ctx.session).toEqual(testSession)
      expect(ctx.isAuthenticated).toBe(true)
    })

    it('should provide getUser method that throws when unauthenticated', () => {
      const ctx = getAuthContext()

      expect(() => ctx.getUser()).toThrow(UnauthenticatedError)
    })

    it('should provide getSession method that throws when unauthenticated', () => {
      const ctx = getAuthContext()

      expect(() => ctx.getSession()).toThrow(UnauthenticatedError)
    })

    it('should provide getUser method that returns user when authenticated', () => {
      mockContextStore.set(AUTH_USER_KEY, testUser)
      mockContextStore.set(AUTH_SESSION_KEY, testSession)

      const ctx = getAuthContext()

      expect(ctx.getUser()).toEqual(testUser)
    })

    it('should provide getSession method that returns session when authenticated', () => {
      mockContextStore.set(AUTH_USER_KEY, testUser)
      mockContextStore.set(AUTH_SESSION_KEY, testSession)

      const ctx = getAuthContext()

      expect(ctx.getSession()).toEqual(testSession)
    })
  })

  describe('requireAuth', () => {
    it('should throw RedirectError when not authenticated', () => {
      expect(() => requireAuth()).toThrow()
      expect(mockRedirectErrors.length).toBe(1)
    })

    it('should redirect to default sign-in URL', () => {
      try {
        requireAuth()
      } catch {
        // Error is expected
      }
      expect(mockRedirectErrors.length).toBe(1)
      expect(mockRedirectErrors[0].url).toContain('/auth/signin')
      expect(mockRedirectErrors[0].url).toContain('callbackUrl=')
    })

    it('should redirect to custom URL when provided', () => {
      try {
        requireAuth({ redirectTo: '/login' })
      } catch {
        // Error is expected
      }
      expect(mockRedirectErrors.length).toBe(1)
      expect(mockRedirectErrors[0].url).toContain('/login')
    })

    it('should redirect to config sign-in URL', () => {
      const config: AuthConfig = {
        providers: [],
        pages: { signIn: '/custom-login' },
      }
      mockContextStore.set(AUTH_CONFIG_KEY, config)

      try {
        requireAuth()
      } catch {
        // Error is expected
      }
      expect(mockRedirectErrors.length).toBe(1)
      expect(mockRedirectErrors[0].url).toContain('/custom-login')
    })

    it('should throw UnauthenticatedError when throwError is true', () => {
      expect(() => requireAuth({ throwError: true })).toThrow(UnauthenticatedError)
    })

    it('should throw UnauthenticatedError with custom message', () => {
      try {
        requireAuth({ throwError: true, message: 'Please log in' })
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthenticatedError)
        expect((error as UnauthenticatedError).message).toBe('Please log in')
      }
    })

    it('should return user when authenticated', () => {
      mockContextStore.set(AUTH_USER_KEY, testUser)

      const user = requireAuth()
      expect(user).toEqual(testUser)
    })
  })

  describe('requireRole', () => {
    it('should throw RedirectError when not authenticated', () => {
      expect(() => requireRole('admin')).toThrow()
      expect(mockRedirectErrors.length).toBe(1)
    })

    it('should throw ForbiddenError when role not present', () => {
      mockContextStore.set(AUTH_USER_KEY, testUser)

      expect(() => requireRole('admin')).toThrow(ForbiddenError)
    })

    it('should include requiredRole in ForbiddenError', () => {
      mockContextStore.set(AUTH_USER_KEY, testUser)

      try {
        requireRole('admin')
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenError)
        expect((error as ForbiddenError).requiredRole).toBe('admin')
      }
    })

    it('should throw ForbiddenError with custom message', () => {
      mockContextStore.set(AUTH_USER_KEY, testUser)

      try {
        requireRole('admin', { message: 'Admins only!' })
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenError)
        expect((error as ForbiddenError).message).toBe('Admins only!')
      }
    })

    it('should return user when role is present', () => {
      mockContextStore.set(AUTH_USER_KEY, testUser)

      const user = requireRole('editor')
      expect(user).toEqual(testUser)
    })
  })

  describe('requireAnyRole', () => {
    it('should throw RedirectError when not authenticated', () => {
      expect(() => requireAnyRole(['admin', 'moderator'])).toThrow()
      expect(mockRedirectErrors.length).toBe(1)
    })

    it('should throw ForbiddenError when no matching role', () => {
      mockContextStore.set(AUTH_USER_KEY, testUser)

      expect(() => requireAnyRole(['admin', 'moderator'])).toThrow(ForbiddenError)
    })

    it('should return user when one of the roles is present', () => {
      mockContextStore.set(AUTH_USER_KEY, testUser)

      const user = requireAnyRole(['admin', 'editor'])
      expect(user).toEqual(testUser)
    })

    it('should return user when multiple matching roles', () => {
      mockContextStore.set(AUTH_USER_KEY, testUser)

      const user = requireAnyRole(['editor', 'viewer'])
      expect(user).toEqual(testUser)
    })

    it('should throw ForbiddenError with custom message', () => {
      mockContextStore.set(AUTH_USER_KEY, testUser)

      try {
        requireAnyRole(['admin', 'moderator'], { message: 'Staff only!' })
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenError)
        expect((error as ForbiddenError).message).toBe('Staff only!')
      }
    })
  })

  describe('requirePermission', () => {
    it('should throw RedirectError when not authenticated', () => {
      expect(() => requirePermission('posts:delete')).toThrow()
      expect(mockRedirectErrors.length).toBe(1)
    })

    it('should throw ForbiddenError when permission not present', () => {
      mockContextStore.set(AUTH_USER_KEY, testUser)

      expect(() => requirePermission('users:manage')).toThrow(ForbiddenError)
    })

    it('should include requiredPermission in ForbiddenError', () => {
      mockContextStore.set(AUTH_USER_KEY, testUser)

      try {
        requirePermission('users:manage')
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenError)
        expect((error as ForbiddenError).requiredPermission).toBe('users:manage')
      }
    })

    it('should return user for direct permission', () => {
      mockContextStore.set(AUTH_USER_KEY, testUser)

      const user = requirePermission('posts:create')
      expect(user).toEqual(testUser)
    })

    it('should return user for role-based permission', () => {
      mockContextStore.set(AUTH_USER_KEY, testUser)

      const user = requirePermission('posts:edit')
      expect(user).toEqual(testUser)
    })

    it('should throw ForbiddenError with custom message', () => {
      mockContextStore.set(AUTH_USER_KEY, testUser)

      try {
        requirePermission('users:manage', { message: 'Cannot manage users' })
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenError)
        expect((error as ForbiddenError).message).toBe('Cannot manage users')
      }
    })
  })

  describe('setAuthContext', () => {
    it('should set user and session in context', () => {
      setAuthContext(testUser, testSession)

      expect(mockContextStore.get(AUTH_USER_KEY)).toEqual(testUser)
      expect(mockContextStore.get(AUTH_SESSION_KEY)).toEqual(testSession)
    })

    it('should set null values', () => {
      setAuthContext(null, null)

      expect(mockContextStore.get(AUTH_USER_KEY)).toBeNull()
      expect(mockContextStore.get(AUTH_SESSION_KEY)).toBeNull()
    })
  })

  describe('setAuthConfig', () => {
    it('should set auth config in context', () => {
      const config: AuthConfig = {
        providers: [],
        pages: { signIn: '/login' },
      }

      setAuthConfig(config)

      expect(mockContextStore.get(AUTH_CONFIG_KEY)).toEqual(config)
    })
  })
})
