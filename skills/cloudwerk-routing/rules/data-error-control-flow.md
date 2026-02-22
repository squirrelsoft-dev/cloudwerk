---
title: Error-Based Control Flow
impact: HIGH
tags: error, not-found, redirect, control-flow
---

## Error-Based Control Flow

**Impact: HIGH**

Cloudwerk uses thrown errors for control flow in loaders and actions. `NotFoundError` triggers a 404 response and `RedirectError` triggers a redirect. This keeps handler code clean and declarative.

**Incorrect (returning status codes manually):**

```typescript
// ❌ Manual status code handling
export async function loader({ params }: LoaderArgs) {
  const post = await getPostBySlug(params.slug)
  if (!post) {
    return { notFound: true, status: 404 }
  }
  return { post }
}

// ❌ Component checks for error state
export default function PostPage({ post, notFound }) {
  if (notFound) return <h1>Not Found</h1>
  return <h1>{post.title}</h1>
}
```

**Correct (throw NotFoundError / RedirectError):**

```typescript
// app/posts/[slug]/page.tsx
import { NotFoundError } from '@cloudwerk/core'
import type { LoaderArgs } from '@cloudwerk/core'

export async function loader({ params }: LoaderArgs) {
  const post = await getPostBySlug(params.slug)
  if (!post) {
    // Automatically returns 404 and renders nearest not-found.tsx boundary
    throw new NotFoundError(`Post not found: ${params.slug}`)
  }
  return { post }
}
```

```typescript
// Redirect example in a loader
import { RedirectError } from '@cloudwerk/core'

export async function loader({ params, request }: LoaderArgs) {
  const session = await getSession(request)
  if (!session) {
    // Automatically returns a 302 redirect
    throw new RedirectError('/login')
  }
  return { user: session.user }
}
```

Key points:
- `NotFoundError` → 404 status, renders nearest `not-found.tsx`
- `RedirectError` → 302 redirect to the specified URL
- Both work in loaders and actions
- Regular thrown `Error` → 500 status, renders nearest `error.tsx`
- This pattern keeps the "happy path" clean with no conditional returns

Reference: `examples/blog/app/posts/[slug]/page.tsx`
