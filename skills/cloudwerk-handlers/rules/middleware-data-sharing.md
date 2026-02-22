---
title: Middleware Data Sharing
impact: HIGH
tags: middleware, context, set, get, data-sharing
---

## Middleware Data Sharing

**Impact: HIGH**

Middleware shares data with downstream handlers via the request-scoped context API. Use `ctx.set()` in middleware to store values and `get()` in handlers to retrieve them.

**Incorrect (global state or custom headers for data passing):**

```typescript
// ❌ Global variable — shared across all concurrent requests!
let currentUser: User | null = null

export const middleware: Middleware = async (request, next) => {
  currentUser = await getSession(request)
  return next()
}

// ❌ Encoding data in headers
export const middleware: Middleware = async (request, next) => {
  const user = await getSession(request)
  request.headers.set('X-User-Id', user.id) // Headers are immutable
  return next()
}
```

**Correct (context set/get pattern):**

```typescript
// app/middleware.ts — set data
import type { Middleware } from '@cloudwerk/core'
import { getContext } from '@cloudwerk/core'

export const middleware: Middleware = async (request, next) => {
  const ctx = getContext()
  const session = await getSession(request)
  ctx.set('session', session)
  return next()
}

// app/api/admin/flags/route.ts — retrieve data
import { get } from '@cloudwerk/core/context'

interface AuthSession {
  user?: { id: string; email?: string }
}

export async function POST(request: Request) {
  const session = get<AuthSession>('session')
  const flag = await createFlag(body, {
    userId: session?.user?.id,
    userEmail: session?.user?.email,
  })
  return json({ flag }, 201)
}
```

Key points:
- `getContext().set(key, value)` — store per-request data in middleware
- `get<T>(key)` or `getContext().get<T>(key)` — retrieve in any downstream code
- Data is scoped to the current request — safe for concurrent requests
- Type parameter `<T>` provides type safety at retrieval
- Common keys: `'session'`, `'user'`, `'auth:user'`, `'auth:session'`

Reference: `examples/feature-flags/app/api/admin/flags/route.ts`
