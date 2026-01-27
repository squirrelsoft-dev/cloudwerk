/**
 * Root middleware - applies to all routes
 */
import type { Middleware } from '@cloudwerk/core'
import { getContext } from '@cloudwerk/core'

export const middleware: Middleware = async (request, next) => {
  const ctx = getContext()

  // Add timing header
  const start = Date.now()
  ctx.set('requestStart', start)

  const response = await next()

  // Add response time header
  const duration = Date.now() - start
  const newResponse = new Response(response.body, {
    status: response.status,
    headers: response.headers,
  })
  newResponse.headers.set('X-Response-Time', `${duration}ms`)

  return newResponse
}
