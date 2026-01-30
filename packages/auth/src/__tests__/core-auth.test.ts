import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Session, User, SessionAdapter, CookieSessionStore, UserAdapter } from '../types.js'
import { createCoreAuthMiddleware } from '../middleware/core-auth.js'
import { AUTH_USER_KEY, AUTH_SESSION_KEY } from '../context.js'

// Mock context storage
const mockContextStore = new Map<string, unknown>()
const mockRequest = new Request('https://example.com/dashboard')

vi.mock('@cloudwerk/core', () => ({
  getContext: () => ({
    get: <T>(key: string): T | undefined => mockContextStore.get(key) as T | undefined,
    set: <T>(key: string, value: T): void => {
      mockContextStore.set(key, value)
    },
    request: mockRequest,
  }),
}))

describe('Core Auth Middleware', () => {
  const testUser: User = {
    id: 'user_1',
    email: 'test@example.com',
    emailVerified: new Date(),
    name: 'Test User',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const testSession: Session = {
    id: 'sess_1',
    userId: 'user_1',
    sessionToken: 'token_abc',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const expiredSession: Session = {
    ...testSession,
    id: 'sess_expired',
    expiresAt: new Date(Date.now() - 1000),
  }

  const createMockSessionAdapter = (
    session: Session | null = testSession
  ): SessionAdapter => ({
    createSession: vi.fn(),
    getSession: vi.fn().mockResolvedValue(session),
    getSessionAndUser: vi.fn(),
    updateSession: vi.fn(),
    deleteSession: vi.fn(),
  })

  const createMockCookieStore = (
    session: Session | null = testSession
  ): CookieSessionStore => ({
    encode: vi.fn().mockResolvedValue('jwt-token'),
    decode: vi.fn().mockResolvedValue(session),
  })

  const createMockUserAdapter = (user: User | null = testUser): UserAdapter => ({
    createUser: vi.fn(),
    getUser: vi.fn().mockResolvedValue(user),
    getUserByEmail: vi.fn(),
    getUserByAccount: vi.fn(),
    updateUser: vi.fn(),
    deleteUser: vi.fn(),
    linkAccount: vi.fn(),
    unlinkAccount: vi.fn(),
    createVerificationToken: vi.fn(),
    useVerificationToken: vi.fn(),
  })

  const createRequest = (cookieToken?: string): Request => {
    const headers = new Headers()
    if (cookieToken) {
      headers.set('Cookie', `cloudwerk.session-token=${cookieToken}`)
    }
    return new Request('https://example.com/dashboard', { headers })
  }

  const next = async (): Promise<Response> => new Response('OK')

  beforeEach(() => {
    mockContextStore.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('configuration validation', () => {
    it('should throw if database strategy without sessionAdapter', () => {
      expect(() =>
        createCoreAuthMiddleware({
          strategy: 'database',
        })
      ).toThrow('sessionAdapter is required for database strategy')
    })

    it('should throw if jwt strategy without cookieStore', () => {
      expect(() =>
        createCoreAuthMiddleware({
          strategy: 'jwt',
        })
      ).toThrow('cookieStore is required for jwt strategy')
    })
  })

  describe('database strategy', () => {
    it('should set null auth context when no session cookie', async () => {
      const sessionAdapter = createMockSessionAdapter()
      const middleware = createCoreAuthMiddleware({
        strategy: 'database',
        sessionAdapter,
      })

      const request = createRequest()
      await middleware(request, next)

      expect(mockContextStore.get(AUTH_USER_KEY)).toBeNull()
      expect(mockContextStore.get(AUTH_SESSION_KEY)).toBeNull()
    })

    it('should validate session from database', async () => {
      const sessionAdapter = createMockSessionAdapter()
      const middleware = createCoreAuthMiddleware({
        strategy: 'database',
        sessionAdapter,
      })

      const request = createRequest('valid-token')
      await middleware(request, next)

      expect(sessionAdapter.getSession).toHaveBeenCalledWith('valid-token')
      expect(mockContextStore.get(AUTH_SESSION_KEY)).toEqual(testSession)
    })

    it('should create minimal user when no userAdapter', async () => {
      const sessionAdapter = createMockSessionAdapter()
      const middleware = createCoreAuthMiddleware({
        strategy: 'database',
        sessionAdapter,
      })

      const request = createRequest('valid-token')
      await middleware(request, next)

      const user = mockContextStore.get(AUTH_USER_KEY) as User
      expect(user.id).toBe('user_1')
      expect(user.email).toBe('')
    })

    it('should fetch full user when userAdapter provided', async () => {
      const sessionAdapter = createMockSessionAdapter()
      const userAdapter = createMockUserAdapter()
      const middleware = createCoreAuthMiddleware({
        strategy: 'database',
        sessionAdapter,
        userAdapter,
      })

      const request = createRequest('valid-token')
      await middleware(request, next)

      expect(userAdapter.getUser).toHaveBeenCalledWith('user_1')
      expect(mockContextStore.get(AUTH_USER_KEY)).toEqual(testUser)
    })

    it('should handle expired sessions', async () => {
      const sessionAdapter = createMockSessionAdapter(expiredSession)
      const middleware = createCoreAuthMiddleware({
        strategy: 'database',
        sessionAdapter,
      })

      const request = createRequest('expired-token')
      await middleware(request, next)

      expect(mockContextStore.get(AUTH_USER_KEY)).toBeNull()
      expect(mockContextStore.get(AUTH_SESSION_KEY)).toBeNull()
    })

    it('should handle null session from adapter', async () => {
      const sessionAdapter = createMockSessionAdapter(null)
      const middleware = createCoreAuthMiddleware({
        strategy: 'database',
        sessionAdapter,
      })

      const request = createRequest('invalid-token')
      await middleware(request, next)

      expect(mockContextStore.get(AUTH_USER_KEY)).toBeNull()
      expect(mockContextStore.get(AUTH_SESSION_KEY)).toBeNull()
    })
  })

  describe('jwt strategy', () => {
    it('should decode JWT token', async () => {
      const cookieStore = createMockCookieStore()
      const middleware = createCoreAuthMiddleware({
        strategy: 'jwt',
        cookieStore,
      })

      const request = createRequest('jwt-token')
      await middleware(request, next)

      expect(cookieStore.decode).toHaveBeenCalledWith('jwt-token')
      expect(mockContextStore.get(AUTH_SESSION_KEY)).toEqual(testSession)
    })

    it('should handle invalid JWT', async () => {
      const cookieStore = createMockCookieStore(null)
      const middleware = createCoreAuthMiddleware({
        strategy: 'jwt',
        cookieStore,
      })

      const request = createRequest('invalid-jwt')
      await middleware(request, next)

      expect(mockContextStore.get(AUTH_USER_KEY)).toBeNull()
      expect(mockContextStore.get(AUTH_SESSION_KEY)).toBeNull()
    })
  })

  describe('onSession callback', () => {
    it('should call onSession with session, user, and request', async () => {
      const sessionAdapter = createMockSessionAdapter()
      const userAdapter = createMockUserAdapter()
      const onSession = vi.fn().mockResolvedValue(undefined)

      const middleware = createCoreAuthMiddleware({
        strategy: 'database',
        sessionAdapter,
        userAdapter,
        onSession,
      })

      const request = createRequest('valid-token')
      await middleware(request, next)

      expect(onSession).toHaveBeenCalledWith({
        session: testSession,
        user: testUser,
        request,
      })
    })

    it('should allow enriching user data', async () => {
      const sessionAdapter = createMockSessionAdapter()
      const enrichedUser = { ...testUser, data: { customField: 'value' } }
      const onSession = vi.fn().mockResolvedValue({ user: enrichedUser })

      const middleware = createCoreAuthMiddleware({
        strategy: 'database',
        sessionAdapter,
        onSession,
      })

      const request = createRequest('valid-token')
      await middleware(request, next)

      expect(mockContextStore.get(AUTH_USER_KEY)).toEqual(enrichedUser)
    })

    it('should allow enriching session data', async () => {
      const sessionAdapter = createMockSessionAdapter()
      const enrichedSession = { ...testSession, data: { customField: 'value' } }
      const onSession = vi.fn().mockResolvedValue({ session: enrichedSession })

      const middleware = createCoreAuthMiddleware({
        strategy: 'database',
        sessionAdapter,
        onSession,
      })

      const request = createRequest('valid-token')
      await middleware(request, next)

      expect(mockContextStore.get(AUTH_SESSION_KEY)).toEqual(enrichedSession)
    })

    it('should handle onSession errors gracefully', async () => {
      const sessionAdapter = createMockSessionAdapter()
      const onSession = vi.fn().mockRejectedValue(new Error('Callback error'))
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const middleware = createCoreAuthMiddleware({
        strategy: 'database',
        sessionAdapter,
        onSession,
      })

      const request = createRequest('valid-token')
      const response = await middleware(request, next)

      // Should still complete successfully
      expect(response.status).toBe(200)
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })

    it('should not call onSession when not authenticated', async () => {
      const sessionAdapter = createMockSessionAdapter(null)
      const onSession = vi.fn()

      const middleware = createCoreAuthMiddleware({
        strategy: 'database',
        sessionAdapter,
        onSession,
      })

      const request = createRequest('invalid-token')
      await middleware(request, next)

      expect(onSession).not.toHaveBeenCalled()
    })
  })

  describe('custom cookie name', () => {
    it('should use custom cookie name', async () => {
      const sessionAdapter = createMockSessionAdapter()
      const middleware = createCoreAuthMiddleware({
        strategy: 'database',
        sessionAdapter,
        cookieName: 'my-session',
      })

      const headers = new Headers()
      headers.set('Cookie', 'my-session=custom-token')
      const request = new Request('https://example.com', { headers })

      await middleware(request, next)

      expect(sessionAdapter.getSession).toHaveBeenCalledWith('custom-token')
    })
  })

  describe('response handling', () => {
    it('should pass through downstream response', async () => {
      const sessionAdapter = createMockSessionAdapter()
      const middleware = createCoreAuthMiddleware({
        strategy: 'database',
        sessionAdapter,
      })

      const customNext = async (): Promise<Response> =>
        new Response('Custom', { status: 201 })

      const request = createRequest('valid-token')
      const response = await middleware(request, customNext)

      expect(response.status).toBe(201)
    })
  })
})
