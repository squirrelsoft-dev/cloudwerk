import type { Middleware } from '@cloudwerk/core'

export const middleware: Middleware = async (request, next) => {
  const response = await next()

  // Add header to mark root middleware ran
  response.headers.set('X-Root-Middleware', 'executed')

  return response
}
