---
title: Dynamic Route Segments
impact: HIGH
tags: params, dynamic, segments, routing
---

## Dynamic Route Segments

**Impact: HIGH**

Dynamic segments use `[paramName]` bracket syntax in directory names. The param value is extracted from the URL and available via `params` in handlers and loaders.

**Incorrect (hardcoding routes or wrong param access):**

```typescript
// ❌ Hardcoded route instead of dynamic segment
// app/api/admin/flags/123/route.ts

// ❌ Accessing params from request URL manually
export async function GET(request: Request) {
  const url = new URL(request.url)
  const id = url.pathname.split('/').pop()
  return json({ id })
}
```

**Correct (dynamic segment with params):**

```typescript
// app/api/admin/flags/[id]/route.ts
import { json, type CloudwerkHandlerContext } from '@cloudwerk/core/runtime'
import { getFlag, updateFlag, deleteFlag } from '@/services/flags/service'

export async function GET(_request: Request, { params }: CloudwerkHandlerContext) {
  const flag = await getFlag(params.id)
  if (!flag) {
    return json({ error: 'Flag not found' }, 404)
  }
  return json({ flag })
}

export async function PUT(request: Request, { params }: CloudwerkHandlerContext) {
  const body = (await request.json()) as UpdateFlagInput
  const flag = await updateFlag(params.id, body)
  if (!flag) {
    return json({ error: 'Flag not found' }, 404)
  }
  return json({ flag })
}

export async function DELETE(_request: Request, { params }: CloudwerkHandlerContext) {
  const deleted = await deleteFlag(params.id)
  if (!deleted) {
    return json({ error: 'Flag not found' }, 404)
  }
  return json({ success: true })
}
```

Key points:
- Directory name `[id]` creates a dynamic segment
- `params.id` gives the matched URL value (name matches bracket content)
- In route handlers: access via `{ params }: CloudwerkHandlerContext`
- In loaders: access via `{ params }: LoaderArgs`
- Multiple segments work: `app/users/[userId]/posts/[postId]/page.tsx`
- File path `app/posts/[slug]/page.tsx` → URL pattern `/posts/:slug`

Reference: `examples/feature-flags/app/api/admin/flags/[id]/route.ts`
