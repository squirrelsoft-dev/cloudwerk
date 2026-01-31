/**
 * API Rate Limiting Middleware
 */

import type { Middleware } from '@cloudwerk/core'
import { LINKLY_CACHE } from '@cloudwerk/core/bindings'
import {
  createRateLimiter,
  createFixedWindowStorage,
} from '@cloudwerk/core/middleware'

// Rate limit: 10 requests per minute per IP
const RATE_LIMIT = 10
const RATE_WINDOW = 60 // seconds

export const middleware: Middleware = async (request, next) => {
  // Create rate limiter with KV storage
  const storage = createFixedWindowStorage(LINKLY_CACHE, 'ratelimit:api:')
  const rateLimiter = createRateLimiter({
    limit: RATE_LIMIT,
    window: RATE_WINDOW,
    storage,
  })

  // Check rate limit
  const { response, result } = await rateLimiter.check(request)

  // If rate limited, return 429 response
  if (response) {
    return response
  }

  // Continue to route handler
  const res = await next()

  // Add rate limit headers to response
  const headers = rateLimiter.headers(result)
  for (const [key, value] of Object.entries(headers)) {
    res.headers.set(key, String(value))
  }

  return res
}
