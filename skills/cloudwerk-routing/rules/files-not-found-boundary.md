---
title: Not-Found Boundary Conventions
impact: HIGH
tags: not-found, 404, boundary, error-handling
---

## Not-Found Boundary Conventions

**Impact: HIGH**

Not-found boundaries (`not-found.tsx`) render when a `NotFoundError` is thrown from a loader or action. They provide custom 404 pages at any route level.

**Incorrect (catching NotFoundError manually):**

```tsx
// app/posts/[slug]/page.tsx
// ❌ Handling 404 inside the page component
export default function PostPage({ post }: PostPageProps) {
  if (!post) {
    return <h1>404 - Post not found</h1>
  }
  return <h1>{post.title}</h1>
}
```

**Correct (throw NotFoundError + not-found.tsx boundary):**

```tsx
// app/posts/[slug]/page.tsx — throw in loader
import { NotFoundError } from '@cloudwerk/core'

export async function loader({ params }: LoaderArgs) {
  const post = await getPostBySlug(params.slug)
  if (!post) {
    throw new NotFoundError(`Post not found: ${params.slug}`)
  }
  return { post }
}

// app/not-found.tsx — boundary component
import type { NotFoundProps } from '@cloudwerk/core'

export default function NotFound({ params, searchParams }: NotFoundProps) {
  return (
    <div>
      <h1>404 - Page Not Found</h1>
      <p>The requested resource could not be found.</p>
    </div>
  )
}
```

Key points:
- Use `NotFoundProps` type for the component props
- Receives `params` and `searchParams` for contextual 404 messages
- Throw `NotFoundError` from loaders/actions to trigger the boundary
- The nearest `not-found.tsx` in the directory tree is used
- Returns a 404 HTTP status code automatically

Reference: `examples/feature-flags/app/not-found.tsx`
