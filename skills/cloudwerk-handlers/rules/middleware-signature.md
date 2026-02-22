---
title: Middleware Signature
impact: HIGH
tags: middleware, signature, next, response
---

## Middleware Signature

**Impact: HIGH**

Cloudwerk middleware uses a `(request, next) => Response` signature. Middleware receives the Request and a `next()` function to continue to downstream handlers. It must return a Response.

**Incorrect (Express or Hono middleware pattern):**

```typescript
// ❌ Express middleware pattern
export function middleware(req: any, res: any, next: any) {
  if (!req.headers.authorization) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  next()
}

// ❌ Hono middleware pattern
export const middleware = async (c: Context, next: Next) => {
  c.set('user', await getUser(c))
  await next()
}
```

**Correct (Cloudwerk middleware signature):**

```typescript
import type { Middleware } from '@cloudwerk/core'

// Simple auth guard
export const middleware: Middleware = async (request, next) => {
  const session = await getSession(request)
  if (!session) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Continue to route handler
  return next()
}

// Middleware that modifies the response
export const middleware: Middleware = async (request, next) => {
  const start = Date.now()
  const response = await next()
  response.headers.set('X-Response-Time', `${Date.now() - start}ms`)
  return response
}
```

Key points:
- Type: `Middleware = (request: Request, next: () => Promise<Response>) => Response | Promise<Response>`
- Export as `export const middleware: Middleware`
- Must return a `Response` — either from `next()` or short-circuit
- Call `next()` to continue to downstream handlers
- Can read/modify response after `next()` returns
- Place `middleware.ts` in any directory — applies to all routes below it

Reference: `examples/linkly/app/api/middleware.ts`
