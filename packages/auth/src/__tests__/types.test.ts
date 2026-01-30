import { describe, it, expect } from 'vitest'
import type {
  User,
  Session,
  Account,
  AuthConfig,
  SessionConfig,
  Provider,
  OAuthProvider,
  CredentialsProvider,
  EmailProvider,
  AuthCallbacks,
  AuthContext,
  SessionAdapter,
  UserAdapter,
  Awaitable,
} from '../types.js'
import { AuthError } from '../types.js'

describe('Auth Types', () => {
  describe('User type', () => {
    it('should allow basic user properties', () => {
      const user: User = {
        id: '1',
        email: 'test@example.com',
        emailVerified: new Date(),
        name: 'Test User',
        image: 'https://example.com/avatar.png',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      expect(user.id).toBe('1')
      expect(user.email).toBe('test@example.com')
    })

    it('should allow custom user data', () => {
      interface CustomData {
        role: 'admin' | 'user'
        preferences: { theme: 'light' | 'dark' }
      }

      const user: User<CustomData> = {
        id: '1',
        email: 'test@example.com',
        emailVerified: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        data: {
          role: 'admin',
          preferences: { theme: 'dark' },
        },
      }

      expect(user.data?.role).toBe('admin')
    })
  })

  describe('Session type', () => {
    it('should allow basic session properties', () => {
      const session: Session = {
        id: 'sess_1',
        userId: 'user_1',
        sessionToken: 'token_abc',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      expect(session.id).toBe('sess_1')
      expect(session.userId).toBe('user_1')
    })

    it('should allow custom session data', () => {
      interface CartData {
        cartId: string
        itemCount: number
      }

      const session: Session<CartData> = {
        id: 'sess_1',
        userId: 'user_1',
        sessionToken: 'token_abc',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
        data: {
          cartId: 'cart_123',
          itemCount: 3,
        },
      }

      expect(session.data?.itemCount).toBe(3)
    })
  })

  describe('Account type', () => {
    it('should represent OAuth accounts', () => {
      const account: Account = {
        id: 'acc_1',
        userId: 'user_1',
        type: 'oauth',
        provider: 'google',
        providerAccountId: 'google_123',
        accessToken: 'access_token_here',
        refreshToken: 'refresh_token_here',
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
        tokenType: 'Bearer',
        scope: 'openid email profile',
      }

      expect(account.provider).toBe('google')
      expect(account.type).toBe('oauth')
    })
  })

  describe('AuthError', () => {
    it('should create error with code', () => {
      const error = new AuthError('SessionRequired')

      expect(error.code).toBe('SessionRequired')
      expect(error.status).toBe(401)
      expect(error.message).toBe('SessionRequired')
      expect(error.name).toBe('AuthError')
    })

    it('should create error with custom message', () => {
      const error = new AuthError('AccessDenied', 'You do not have permission')

      expect(error.code).toBe('AccessDenied')
      expect(error.status).toBe(403)
      expect(error.message).toBe('You do not have permission')
    })

    it('should create error with custom status', () => {
      const error = new AuthError('Configuration', 'Config error', { status: 503 })

      expect(error.status).toBe(503)
    })

    it('should create error with cause', () => {
      const cause = new Error('Original error')
      const error = new AuthError('OAuthCallback', 'OAuth failed', { cause })

      expect(error.cause).toBe(cause)
    })

    it('should return correct status codes for error codes', () => {
      expect(AuthError.getStatusForCode('SessionRequired')).toBe(401)
      expect(AuthError.getStatusForCode('InvalidCSRF')).toBe(401)
      expect(AuthError.getStatusForCode('AccessDenied')).toBe(403)
      expect(AuthError.getStatusForCode('InvalidProvider')).toBe(404)
      expect(AuthError.getStatusForCode('InvalidCallback')).toBe(404)
      expect(AuthError.getStatusForCode('Configuration')).toBe(500)
      expect(AuthError.getStatusForCode('OAuthSignin')).toBe(500)
    })
  })

  describe('Provider types', () => {
    it('should define base provider interface', () => {
      const provider: Provider = {
        id: 'custom',
        name: 'Custom Provider',
        type: 'oauth',
      }

      expect(provider.id).toBe('custom')
    })

    it('should define OAuth provider interface', () => {
      const provider: OAuthProvider = {
        id: 'github',
        name: 'GitHub',
        type: 'oauth',
        clientId: 'client_id',
        clientSecret: 'client_secret',
        authorization: 'https://github.com/login/oauth/authorize',
        token: 'https://github.com/login/oauth/access_token',
        userinfo: 'https://api.github.com/user',
        scope: 'read:user user:email',
      }

      expect(provider.clientId).toBe('client_id')
    })

    it('should define OIDC provider with well-known', () => {
      const provider: OAuthProvider = {
        id: 'google',
        name: 'Google',
        type: 'oidc',
        clientId: 'client_id',
        clientSecret: 'client_secret',
        wellKnown: 'https://accounts.google.com/.well-known/openid-configuration',
        checks: ['pkce', 'state', 'nonce'],
      }

      expect(provider.wellKnown).toContain('.well-known')
    })

    it('should define credentials provider interface', () => {
      const provider: CredentialsProvider = {
        id: 'credentials',
        name: 'Email & Password',
        type: 'credentials',
        credentials: {
          email: { label: 'Email', type: 'email', required: true },
          password: { label: 'Password', type: 'password', required: true },
        },
        authorize: async (credentials) => {
          if (credentials.email === 'test@example.com') {
            return {
              id: '1',
              email: credentials.email,
              emailVerified: null,
            }
          }
          return null
        },
      }

      expect(provider.credentials.email.type).toBe('email')
    })

    it('should define email provider interface', () => {
      const provider: EmailProvider = {
        id: 'email',
        name: 'Email',
        type: 'email',
        from: 'noreply@example.com',
        maxAge: 24 * 60 * 60,
        sendVerificationRequest: async ({ identifier, url }) => {
          // Send email logic would go here
          expect(identifier).toBeDefined()
          expect(url).toBeDefined()
        },
      }

      expect(provider.from).toBe('noreply@example.com')
    })
  })

  describe('AuthConfig type', () => {
    it('should allow minimal config', () => {
      const config: AuthConfig = {
        providers: [],
      }

      expect(config.providers).toHaveLength(0)
    })

    it('should allow full config', () => {
      const config: AuthConfig = {
        providers: [],
        session: {
          strategy: 'jwt',
          maxAge: 30 * 24 * 60 * 60,
          updateAge: 24 * 60 * 60,
        },
        cookies: {
          sessionToken: {
            name: 'session-token',
            options: {
              httpOnly: true,
              secure: true,
              sameSite: 'lax',
            },
          },
        },
        csrf: {
          enabled: true,
          methods: ['POST', 'PUT', 'DELETE'],
        },
        pages: {
          signIn: '/auth/login',
          signOut: '/auth/logout',
          error: '/auth/error',
        },
        debug: false,
        basePath: '/auth',
        trustHost: true,
      }

      expect(config.session?.strategy).toBe('jwt')
      expect(config.pages?.signIn).toBe('/auth/login')
    })
  })

  describe('Adapter types', () => {
    it('should define session adapter interface', () => {
      const adapter: SessionAdapter = {
        createSession: async (session) => ({ ...session, id: 'new_id' }),
        getSession: async () => null,
        getSessionAndUser: async () => null,
        updateSession: async () => null,
        deleteSession: async () => {},
      }

      expect(adapter.createSession).toBeDefined()
    })

    it('should define user adapter interface', () => {
      const adapter: UserAdapter = {
        createUser: async (user) => ({
          ...user,
          id: 'new_id',
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
        getUser: async () => null,
        getUserByEmail: async () => null,
        getUserByAccount: async () => null,
        updateUser: async (id, data) => ({
          id,
          email: 'test@example.com',
          emailVerified: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data,
        }),
        deleteUser: async () => {},
        linkAccount: async (account) => ({ ...account, id: 'new_id' }),
        unlinkAccount: async () => {},
        createVerificationToken: async (token) => token,
        useVerificationToken: async () => null,
      }

      expect(adapter.createUser).toBeDefined()
    })
  })

  describe('AuthContext type', () => {
    it('should define auth context interface', () => {
      const ctx: AuthContext = {
        session: null,
        user: null,
        getSession: () => {
          throw new Error('Not authenticated')
        },
        getUser: () => {
          throw new Error('Not authenticated')
        },
        isAuthenticated: false,
      }

      expect(ctx.isAuthenticated).toBe(false)
    })

    it('should allow authenticated context', () => {
      const user: User = {
        id: '1',
        email: 'test@example.com',
        emailVerified: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const session: Session = {
        id: 'sess_1',
        userId: '1',
        sessionToken: 'token',
        expiresAt: new Date(Date.now() + 1000000),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const ctx: AuthContext = {
        session,
        user,
        getSession: () => session,
        getUser: () => user,
        isAuthenticated: true,
      }

      expect(ctx.isAuthenticated).toBe(true)
      expect(ctx.user?.email).toBe('test@example.com')
    })
  })

  describe('Awaitable utility type', () => {
    it('should accept sync values', () => {
      const syncValue: Awaitable<string> = 'hello'
      expect(syncValue).toBe('hello')
    })

    it('should accept async values', async () => {
      const asyncValue: Awaitable<string> = Promise.resolve('hello')
      expect(await asyncValue).toBe('hello')
    })
  })
})
