---
title: CloudwerkHandler Signature
impact: CRITICAL
tags: handler, signature, params, request
---

## CloudwerkHandler Signature

**Impact: CRITICAL**

Route handlers in Cloudwerk use a specific two-argument signature: `(request: Request, context: CloudwerkHandlerContext)`. The context parameter provides typed route params and is optional when no params are needed.

**Incorrect (Express or Hono-style handler):**

```typescript
// ❌ Express-style handler
export function GET(req: any, res: any) {
  res.json({ hello: 'world' })
}

// ❌ Hono-style handler
export function GET(c: Context) {
  return c.json({ hello: 'world' })
}
```

**Correct (Cloudwerk handler signature):**

```typescript
// app/api/admin/flags/[id]/route.ts
import { json, type CloudwerkHandlerContext } from '@cloudwerk/core/runtime'

// Simple handler — no params needed, request param is optional
export async function GET() {
  return json({ status: 'ok' })
}

// Handler with request body
export async function POST(request: Request) {
  const body = await request.json()
  return json({ created: true }, 201)
}

// Handler with dynamic params
export async function GET(_request: Request, { params }: CloudwerkHandlerContext) {
  const flag = await getFlag(params.id)
  if (!flag) {
    return json({ error: 'Flag not found' }, 404)
  }
  return json({ flag })
}

// Typed params with CloudwerkHandler
import type { CloudwerkHandler, CloudwerkHandlerContext } from '@cloudwerk/core'

interface Params {
  code: string
}

export const GET: CloudwerkHandler<Params> = async (
  _request,
  { params }: CloudwerkHandlerContext<Params>
) => {
  const { code } = params
  return redirect(url, 302)
}
```

Key points:
- First argument: `Request` (or `_request` if unused)
- Second argument: `{ params }: CloudwerkHandlerContext` for route params
- Both arguments are optional — omit what you don't need
- Export named HTTP methods: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`
- Return a `Response` object (use helpers like `json()`, `redirect()`)
- Use `CloudwerkHandler<Params>` generic for typed params

Reference: `examples/feature-flags/app/api/admin/flags/[id]/route.ts`, `examples/linkly/app/[code]/route.ts`
