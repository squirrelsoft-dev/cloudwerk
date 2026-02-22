---
title: Middleware Conventions
impact: CRITICAL
tags: middleware, auth, rate-limiting, request-processing
---

## Middleware Conventions

**Impact: CRITICAL**

Middleware files (`middleware.ts`) intercept requests before they reach route handlers. They apply to all routes in their directory and subdirectories.

**Incorrect (wrong export or signature):**

```typescript
// app/middleware.ts
// ❌ Default export instead of named
export default function middleware(req: Request) {
  return new Response('OK')
}

// ❌ Express-style middleware
export function middleware(req: any, res: any, next: any) {
  next()
}
```

**Correct (Cloudwerk middleware signature):**

```typescript
// app/api/middleware.ts
import type { Middleware } from '@cloudwerk/core'
import { LINKLY_CACHE } from '@cloudwerk/core/bindings'
import {
  createRateLimiter,
  createFixedWindowStorage,
} from '@cloudwerk/core/middleware'

export const middleware: Middleware = async (request, next) => {
  // Create rate limiter with KV storage
  const storage = createFixedWindowStorage(LINKLY_CACHE, 'ratelimit:api:')
  const rateLimiter = createRateLimiter({
    limit: 10,
    window: 60,
    storage,
  })

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
```

Key points:
- Export as `export const middleware: Middleware` (named export)
- Receives `(request: Request, next: () => Promise<Response>)`
- Must return a `Response` — either from `next()` or a short-circuit response
- Call `next()` to continue to downstream handlers
- Can modify the response after `next()` returns
- Applies to all routes in the same directory and subdirectories

Reference: `examples/linkly/app/api/middleware.ts`
