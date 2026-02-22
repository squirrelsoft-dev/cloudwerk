---
title: API Route Conventions
impact: CRITICAL
tags: api, route, handler, rest
---

## API Route Conventions

**Impact: CRITICAL**

API routes are defined with `route.ts` files. They export named functions for each HTTP method (GET, POST, PUT, DELETE, etc.). Each handler receives a `Request` and optional `CloudwerkHandlerContext` with params.

**Incorrect (wrong handler signature):**

```typescript
// app/api/flags/route.ts
// ❌ Default export instead of named HTTP methods
export default function handler(req: Request) {
  return Response.json({ flags: [] })
}

// ❌ Using Express-style (req, res) pattern
export function GET(req: Request, res: Response) {
  res.json({ flags: [] })
}
```

**Correct (named HTTP method exports with proper signature):**

```typescript
// app/api/admin/flags/route.ts
import { json } from '@cloudwerk/core/runtime'
import { get } from '@cloudwerk/core/context'
import { listFlags, createFlag } from '@/services/flags/service'
import type { CreateFlagInput } from '@/services/flags/service'

export async function GET() {
  const flags = await listFlags()
  return json({ flags })
}

export async function POST(request: Request) {
  const body = (await request.json()) as CreateFlagInput

  if (!body.key || !body.name) {
    return json({ error: 'key and name are required' }, 400)
  }

  const flag = await createFlag(body)
  return json({ flag }, 201)
}
```

Key points:
- Export named functions matching HTTP methods: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`
- Return a `Response` object (use `json()` helper for JSON responses)
- The second status code argument to `json()` sets the HTTP status
- The `request` parameter is optional if you don't need it
- Use `CloudwerkHandlerContext` for routes with dynamic params

Reference: `examples/feature-flags/app/api/admin/flags/route.ts`
