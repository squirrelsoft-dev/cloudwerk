import { authMiddleware } from '@cloudwerk/auth/middleware'

export const middleware = authMiddleware({
  unauthenticatedRedirect: '/login',
})
