---
title: Cloudwerk vs Hono Middleware
impact: MEDIUM
tags: middleware, hono, differences, migration
---

## Cloudwerk vs Hono Middleware

**Impact: MEDIUM**

Cloudwerk middleware differs from Hono middleware in signature and data passing. Understanding these differences is essential when migrating from Hono or using Hono documentation as reference.

**Incorrect (using Hono middleware patterns):**

```typescript
// ❌ Hono middleware — uses Context object and await next()
import { Context, Next } from 'hono'

const authMiddleware = async (c: Context, next: Next) => {
  const user = await getUser(c.req.header('Authorization'))
  c.set('user', user)     // Hono-style context setting
  await next()             // Hono: await without return
}

app.use('/*', authMiddleware)  // Hono: register via app.use()
```

**Correct (Cloudwerk middleware patterns):**

```typescript
// ✅ Cloudwerk middleware — uses Request/next() signature
import type { Middleware } from '@cloudwerk/core'
import { getContext } from '@cloudwerk/core'

// Export as named 'middleware' from middleware.ts file
export const middleware: Middleware = async (request, next) => {
  const ctx = getContext()
  const user = await getUser(request.headers.get('Authorization'))
  ctx.set('user', user)       // Cloudwerk: use getContext().set()
  return next()                // Cloudwerk: return the response
}

// Composition uses composeMiddleware, not app.use()
import { composeMiddleware } from '@cloudwerk/security/middleware'
export const middleware = composeMiddleware([security, auth])
```

Key differences:
| Feature | Hono | Cloudwerk |
|---------|------|-----------|
| Signature | `(c: Context, next: Next)` | `(request: Request, next: () => Promise<Response>)` |
| Data sharing | `c.set()` / `c.get()` | `getContext().set()` / `get()` |
| Next call | `await next()` (void) | `return next()` (returns Response) |
| Registration | `app.use(path, middleware)` | Export from `middleware.ts` file |
| Composition | Chain `.use()` calls | `composeMiddleware([...])` |

Reference: `examples/feature-flags/app/middleware.ts`
