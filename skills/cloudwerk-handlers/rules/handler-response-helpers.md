---
title: Response Helper Functions
impact: CRITICAL
tags: response, json, redirect, helpers
---

## Response Helper Functions

**Impact: CRITICAL**

Cloudwerk provides response helper functions that create properly formatted `Response` objects. Use these instead of constructing `Response` objects manually.

**Incorrect (manual Response construction):**

```typescript
// ❌ Manual JSON response
export async function GET() {
  return new Response(JSON.stringify({ hello: 'world' }), {
    headers: { 'Content-Type': 'application/json' },
  })
}

// ❌ Manual redirect
export async function GET() {
  return new Response(null, {
    status: 302,
    headers: { Location: '/dashboard' },
  })
}

// ❌ Manual 404
export async function GET() {
  return new Response('Not Found', { status: 404 })
}
```

**Correct (using response helpers):**

```typescript
import { json, redirect, notFoundResponse } from '@cloudwerk/core'

// JSON response with status code
export async function GET() {
  return json({ hello: 'world' })
}

export async function POST(request: Request) {
  const body = await request.json()
  return json({ created: true }, 201)
}

// Redirect
export async function GET(_request: Request, { params }: CloudwerkHandlerContext) {
  const url = await resolveUrl(params.code)
  return redirect(url, 302)
}

// Not found response
export async function GET(_request: Request, { params }: CloudwerkHandlerContext) {
  const item = await getItem(params.id)
  if (!item) {
    return notFoundResponse('Item not found')
  }
  return json({ item })
}
```

Available helpers:
- `json(data, status?)` — JSON response with optional status code
- `redirect(url, status?)` — Redirect response (default 302)
- `notFoundResponse(message?)` — 404 Not Found response

Reference: `examples/linkly/app/[code]/route.ts`, `examples/feature-flags/app/api/admin/flags/route.ts`
