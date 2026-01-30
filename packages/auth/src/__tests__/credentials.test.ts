import { describe, it, expect, vi, beforeEach } from 'vitest'
import { credentials, handleCredentialsSignIn } from '../providers/credentials.js'
import type { SessionManager } from '../session/session-manager.js'
import type { Session, CredentialsProvider } from '../types.js'

// Mock @cloudwerk/core context
const mockContext = {
  request: new Request('http://localhost'),
  env: {
    DB: { prepare: vi.fn() },
    KV: { get: vi.fn(), put: vi.fn() },
  },
  params: {},
  requestId: 'test-request-id',
  get: vi.fn(),
  set: vi.fn(),
}

vi.mock('@cloudwerk/core', () => ({
  getContext: () => mockContext,
}))

// Helper to create a mock session manager
function createMockSessionManager(): SessionManager {
  return {
    createSession: vi.fn().mockResolvedValue({
      id: 'session-id',
      userId: 'user-123',
      sessionToken: 'test-session-token',
      expiresAt: new Date(Date.now() + 86400000),
      createdAt: new Date(),
      updatedAt: new Date(),
    } satisfies Session),
    getSession: vi.fn(),
    invalidateSession: vi.fn(),
    shouldRefresh: vi.fn().mockReturnValue(false),
    refreshSession: vi.fn(),
  }
}

describe('credentials()', () => {
  describe('factory function', () => {
    it('should create provider with default id and name', () => {
      const provider = credentials({
        authorize: async () => null,
      })

      expect(provider.id).toBe('credentials')
      expect(provider.name).toBe('Credentials')
      expect(provider.type).toBe('credentials')
    })

    it('should accept custom id and name', () => {
      const provider = credentials({
        id: 'custom-login',
        name: 'Custom Login',
        authorize: async () => null,
      })

      expect(provider.id).toBe('custom-login')
      expect(provider.name).toBe('Custom Login')
    })

    it('should use default email/password credential fields', () => {
      const provider = credentials({
        authorize: async () => null,
      })

      expect(provider.credentials).toHaveProperty('email')
      expect(provider.credentials).toHaveProperty('password')
      expect(provider.credentials.email.type).toBe('email')
      expect(provider.credentials.password.type).toBe('password')
    })

    it('should accept custom credential fields', () => {
      const provider = credentials({
        credentials: {
          username: { label: 'Username', type: 'text', required: true },
          password: { label: 'Password', type: 'password', required: true },
          otp: { label: 'OTP Code', type: 'text' },
        },
        authorize: async () => null,
      })

      expect(provider.credentials).toHaveProperty('username')
      expect(provider.credentials).toHaveProperty('password')
      expect(provider.credentials).toHaveProperty('otp')
      expect(provider.credentials.username.type).toBe('text')
    })

    it('should pass typed credentials to authorize callback', async () => {
      const authorizeSpy = vi.fn().mockResolvedValue(null)

      const provider = credentials({
        credentials: {
          username: { label: 'Username', type: 'text' },
          token: { label: 'Token', type: 'text' },
        },
        authorize: authorizeSpy,
      })

      await provider.authorize(
        { username: 'testuser', token: 'abc123' },
        new Request('http://localhost')
      )

      expect(authorizeSpy).toHaveBeenCalledWith(
        { username: 'testuser', token: 'abc123' },
        expect.objectContaining({
          request: expect.any(Request),
          env: mockContext.env,
        })
      )
    })

    it('should pass env from context to authorize callback', async () => {
      let capturedEnv: unknown

      const provider = credentials({
        authorize: async (_creds, ctx) => {
          capturedEnv = ctx.env
          return null
        },
      })

      await provider.authorize(
        { email: 'test@example.com', password: 'password' },
        new Request('http://localhost')
      )

      expect(capturedEnv).toBe(mockContext.env)
    })

    it('should return user from authorize callback', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        emailVerified: null,
      }

      const provider = credentials({
        authorize: async () => mockUser,
      })

      const result = await provider.authorize(
        { email: 'test@example.com', password: 'password' },
        new Request('http://localhost')
      )

      expect(result).toEqual(mockUser)
    })
  })
})

describe('handleCredentialsSignIn()', () => {
  let mockSessionManager: SessionManager
  let provider: CredentialsProvider

  beforeEach(() => {
    mockSessionManager = createMockSessionManager()

    provider = credentials({
      authorize: async (creds) => {
        if (creds.email === 'valid@example.com' && creds.password === 'correct') {
          return {
            id: 'user-123',
            email: 'valid@example.com',
            name: 'Valid User',
            emailVerified: null,
          }
        }
        return null
      },
    })
  })

  describe('FormData body', () => {
    it('should handle FormData body', async () => {
      const formData = new FormData()
      formData.append('email', 'valid@example.com')
      formData.append('password', 'correct')

      const request = new Request('http://localhost/auth/signin', {
        method: 'POST',
        body: formData,
      })

      const response = await handleCredentialsSignIn(request, {
        provider,
        sessionManager: mockSessionManager,
      })

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.user.email).toBe('valid@example.com')
    })

    it('should set session cookie on success', async () => {
      const formData = new FormData()
      formData.append('email', 'valid@example.com')
      formData.append('password', 'correct')

      const request = new Request('http://localhost/auth/signin', {
        method: 'POST',
        body: formData,
      })

      const response = await handleCredentialsSignIn(request, {
        provider,
        sessionManager: mockSessionManager,
      })

      const setCookie = response.headers.get('Set-Cookie')
      expect(setCookie).toContain('test-session-token')
    })
  })

  describe('JSON body', () => {
    it('should handle JSON body', async () => {
      const request = new Request('http://localhost/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'valid@example.com',
          password: 'correct',
        }),
      })

      const response = await handleCredentialsSignIn(request, {
        provider,
        sessionManager: mockSessionManager,
      })

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.user.email).toBe('valid@example.com')
    })
  })

  describe('invalid credentials', () => {
    it('should return 401 for invalid credentials', async () => {
      const formData = new FormData()
      formData.append('email', 'valid@example.com')
      formData.append('password', 'wrong')

      const request = new Request('http://localhost/auth/signin', {
        method: 'POST',
        body: formData,
      })

      const response = await handleCredentialsSignIn(request, {
        provider,
        sessionManager: mockSessionManager,
      })

      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error).toBe('CredentialsSignin')
    })

    it('should return 401 for missing required fields', async () => {
      const formData = new FormData()
      formData.append('email', 'valid@example.com')
      // Missing password

      const request = new Request('http://localhost/auth/signin', {
        method: 'POST',
        body: formData,
      })

      const response = await handleCredentialsSignIn(request, {
        provider,
        sessionManager: mockSessionManager,
      })

      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error).toBe('MissingFields')
    })
  })

  describe('redirect options', () => {
    it('should redirect on success when redirectTo is provided', async () => {
      const formData = new FormData()
      formData.append('email', 'valid@example.com')
      formData.append('password', 'correct')

      const request = new Request('http://localhost/auth/signin', {
        method: 'POST',
        body: formData,
      })

      const response = await handleCredentialsSignIn(
        request,
        { provider, sessionManager: mockSessionManager },
        { redirectTo: '/dashboard' }
      )

      expect(response.status).toBe(302)
      expect(response.headers.get('Location')).toBe('/dashboard')
    })

    it('should redirect with error param when errorRedirectTo is provided', async () => {
      const formData = new FormData()
      formData.append('email', 'valid@example.com')
      formData.append('password', 'wrong')

      const request = new Request('http://localhost/auth/signin', {
        method: 'POST',
        body: formData,
      })

      const response = await handleCredentialsSignIn(
        request,
        { provider, sessionManager: mockSessionManager },
        { errorRedirectTo: '/login' }
      )

      expect(response.status).toBe(302)
      const location = response.headers.get('Location')
      expect(location).toContain('/login')
      expect(location).toContain('error=CredentialsSignin')
    })

    it('should include session cookie in redirect response', async () => {
      const formData = new FormData()
      formData.append('email', 'valid@example.com')
      formData.append('password', 'correct')

      const request = new Request('http://localhost/auth/signin', {
        method: 'POST',
        body: formData,
      })

      const response = await handleCredentialsSignIn(
        request,
        { provider, sessionManager: mockSessionManager },
        { redirectTo: '/dashboard' }
      )

      const setCookie = response.headers.get('Set-Cookie')
      expect(setCookie).toContain('test-session-token')
    })
  })

  describe('response payload', () => {
    it('should include user and account in success response', async () => {
      const formData = new FormData()
      formData.append('email', 'valid@example.com')
      formData.append('password', 'correct')

      const request = new Request('http://localhost/auth/signin', {
        method: 'POST',
        body: formData,
      })

      const response = await handleCredentialsSignIn(request, {
        provider,
        sessionManager: mockSessionManager,
      })

      const body = await response.json()

      expect(body.success).toBe(true)
      expect(body.user).toMatchObject({
        id: 'user-123',
        email: 'valid@example.com',
        name: 'Valid User',
      })
      expect(body.account).toMatchObject({
        type: 'credentials',
        provider: 'credentials',
        userId: 'user-123',
      })
    })

    it('should call sessionManager.createSession with user id', async () => {
      const formData = new FormData()
      formData.append('email', 'valid@example.com')
      formData.append('password', 'correct')

      const request = new Request('http://localhost/auth/signin', {
        method: 'POST',
        body: formData,
      })

      await handleCredentialsSignIn(request, {
        provider,
        sessionManager: mockSessionManager,
      })

      expect(mockSessionManager.createSession).toHaveBeenCalledWith('user-123')
    })
  })

  describe('custom credentials schema', () => {
    it('should work with custom credential fields', async () => {
      const customProvider = credentials({
        credentials: {
          username: { label: 'Username', type: 'text', required: true },
          pin: { label: 'PIN', type: 'password', required: true },
        },
        authorize: async (creds) => {
          if (creds.username === 'admin' && creds.pin === '1234') {
            return {
              id: 'admin-123',
              email: 'admin@example.com',
              emailVerified: null,
            }
          }
          return null
        },
      })

      const formData = new FormData()
      formData.append('username', 'admin')
      formData.append('pin', '1234')

      const request = new Request('http://localhost/auth/signin', {
        method: 'POST',
        body: formData,
      })

      const response = await handleCredentialsSignIn(request, {
        provider: customProvider,
        sessionManager: mockSessionManager,
      })

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.user.id).toBe('admin-123')
    })
  })
})
