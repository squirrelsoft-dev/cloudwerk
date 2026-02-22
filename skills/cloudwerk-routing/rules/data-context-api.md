---
title: Context API for Request-Scoped Data
impact: MEDIUM
tags: context, get, set, middleware, request-scope
---

## Context API for Request-Scoped Data

**Impact: MEDIUM**

Cloudwerk provides a request-scoped context via `getContext()`. Middleware can store data with `set()`, and downstream handlers/loaders can retrieve it with `get()`. This replaces passing data through function arguments.

**Incorrect (global state or passing through every function):**

```typescript
// ❌ Global mutable state — shared across requests!
let currentUser: User | null = null

export const middleware: Middleware = async (request, next) => {
  currentUser = await getSession(request)
  return next()
}

// ❌ Threading user through every function call
export async function loader({ params }: LoaderArgs) {
  const user = await getSessionFromRequest(???) // No access to middleware data
  return { user }
}
```

**Correct (getContext/get/set pattern):**

```typescript
// app/middleware.ts — set data in middleware
import type { Middleware } from '@cloudwerk/core'
import { getContext } from '@cloudwerk/core'

export const middleware: Middleware = async (request, next) => {
  const ctx = getContext()
  const session = await getSession(request)
  ctx.set('session', session)
  return next()
}

// app/api/admin/flags/route.ts — retrieve in handler
import { get } from '@cloudwerk/core/context'

export async function POST(request: Request) {
  const session = get<AuthSession>('session')
  const flag = await createFlag(body, {
    userId: session?.user?.id,
  })
  return json({ flag }, 201)
}
```

The full `CloudwerkContext` object also provides:

```typescript
import { getContext } from '@cloudwerk/core'

export async function loader() {
  const ctx = getContext()

  ctx.request      // Original Request object
  ctx.env          // Cloudflare bindings (D1, KV, R2, etc.)
  ctx.executionCtx // Cloudflare ExecutionContext (for waitUntil)
  ctx.params       // Route parameters
  ctx.requestId    // Auto-generated request ID for tracing
  ctx.get('key')   // Get middleware-set data
  ctx.set('key', value) // Set data for downstream code
}
```

Key points:
- `getContext()` returns the request-scoped context — safe for concurrent requests
- `ctx.set(key, value)` in middleware, `ctx.get(key)` or `get(key)` in handlers
- Available in loaders, actions, handlers, and middleware
- `executionCtx.waitUntil()` for background work that outlives the response
- Never use module-level variables for per-request state

Reference: `examples/linkly/app/[code]/route.ts`, `examples/feature-flags/app/api/admin/flags/route.ts`
