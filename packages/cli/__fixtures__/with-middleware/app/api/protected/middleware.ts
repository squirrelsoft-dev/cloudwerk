/**
 * Auth middleware for protected routes
 */
import type { Middleware } from '@cloudwerk/core'
import { getContext } from '@cloudwerk/core'

export const middleware: Middleware = async (request, next) => {
  const ctx = getContext()
  const authHeader = request.headers.get('Authorization')

  if (!authHeader || authHeader !== 'Bearer valid-token') {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  // Set user info for downstream handlers
  ctx.set('user', { id: '123', name: 'Test User' })

  return next()
}
