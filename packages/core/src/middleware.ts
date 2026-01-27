/**
 * @cloudwerk/core - Middleware Adapter
 *
 * Adapts Cloudwerk-native middleware to Hono middleware handlers.
 * Cloudwerk middleware receives standard Request/Response and uses
 * getContext() for data sharing, while Hono middleware uses Context (c).
 */

import type { MiddlewareHandler, Context } from 'hono'
import type { Middleware } from './types.js'

// ============================================================================
// Middleware Adapter
// ============================================================================

/**
 * Creates a Hono middleware handler from a Cloudwerk-native middleware.
 *
 * The adapter:
 * 1. Passes the raw Request to the middleware
 * 2. Wraps Hono's next() to return the downstream Response
 * 3. Returns middleware's response directly (Hono handles response override)
 *
 * Context is already available via getContext() because contextMiddleware
 * runs first in the chain (see createApp.ts line 45).
 *
 * @param middleware - Cloudwerk-native middleware function
 * @returns Hono-compatible middleware handler
 *
 * @example
 * ```typescript
 * import { createMiddlewareAdapter } from '@cloudwerk/core'
 *
 * const authMiddleware: Middleware = async (request, next) => {
 *   const ctx = getContext()
 *   const token = request.headers.get('Authorization')
 *
 *   if (!token) {
 *     return new Response('Unauthorized', { status: 401 })
 *   }
 *
 *   ctx.set('userId', decodeToken(token).userId)
 *   return next()
 * }
 *
 * // Use with Hono
 * app.use('/api/*', createMiddlewareAdapter(authMiddleware))
 * ```
 */
export function createMiddlewareAdapter(middleware: Middleware): MiddlewareHandler {
  return async (c: Context, next) => {
    // Track if next() was called and capture the downstream response
    let nextCalled = false
    let downstreamResponse: Response | undefined

    // Create wrapper for next() that returns the downstream response.
    // Hono's next() awaits downstream handlers but doesn't return the response.
    // We capture c.res after next() completes to get the downstream response.
    const wrappedNext = async (): Promise<Response> => {
      nextCalled = true
      await next()
      downstreamResponse = c.res
      return c.res
    }

    // Call middleware with standard Request and wrapped next.
    // The middleware can:
    // 1. Call next() and return its response (passthrough)
    // 2. Call next(), modify the response, and return modified version
    // 3. Return early without calling next() (e.g., auth failure)
    const response = await middleware(c.req.raw, wrappedNext)

    // If middleware returned a different response than downstream,
    // or if next() wasn't called (early return), set it on context.
    // This ensures Hono uses the middleware's response as final.
    if (!nextCalled || response !== downstreamResponse) {
      c.res = response
    }

    // Return nothing - Hono uses c.res as the response
  }
}
