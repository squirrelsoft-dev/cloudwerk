import { createCoreAuthMiddleware } from '@cloudwerk/auth/middleware'
import { securityMiddleware, composeMiddleware } from '@cloudwerk/security/middleware'

const auth = createCoreAuthMiddleware({
  strategy: 'database',
  kvBinding: 'FLAGSHIP_AUTH_SESSIONS', // Binding name from wrangler.toml, resolved at request time
  pages: {
    signIn: '/login',
  },
})

const security = securityMiddleware({
  // CSRF protection enabled by default
  // Security headers enabled by default
  // X-Requested-With validation enabled by default
})

export const middleware = composeMiddleware([security, auth])
