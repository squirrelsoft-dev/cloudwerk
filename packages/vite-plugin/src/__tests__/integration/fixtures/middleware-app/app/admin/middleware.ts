import type { Middleware } from '@cloudwerk/core'

export const middleware: Middleware = async (request, next) => {
  const response = await next()

  // Add header to mark admin middleware ran
  response.headers.set('X-Admin-Middleware', 'executed')

  return response
}
