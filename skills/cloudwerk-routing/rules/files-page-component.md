---
title: Page Component Conventions
impact: CRITICAL
tags: page, component, routing, rendering
---

## Page Component Conventions

**Impact: CRITICAL**

Pages are the primary route entry point in Cloudwerk. A `page.tsx` file in any directory under `app/` automatically becomes a route. Pages export a default component and optionally a `loader()` for data fetching.

**Incorrect (using wrong export or missing types):**

```tsx
// app/page.tsx
// ❌ Named export instead of default
export function HomePage() {
  return <h1>Home</h1>
}

// ❌ Wrong props type
export default function HomePage(props: { children: any }) {
  return <h1>Home</h1>
}
```

**Correct (default export with PageProps):**

```tsx
// app/page.tsx
import type { PageProps, LoaderArgs } from '@cloudwerk/core'
import { getPosts, type Post } from './lib/db'
import PostCard from './components/PostCard'

export async function loader(_args: LoaderArgs) {
  const posts = await getPosts()
  return { posts }
}

interface HomePageProps extends PageProps {
  posts: Post[]
}

export default function HomePage({ posts }: HomePageProps) {
  return (
    <div class="min-h-screen bg-gray-100 py-12 px-4">
      <div class="max-w-2xl mx-auto">
        <h1 class="text-4xl font-bold text-gray-900 mb-4">My Blog</h1>
        <div class="space-y-6">
          {posts.map((post) => (
            <PostCard post={post} />
          ))}
        </div>
      </div>
    </div>
  )
}
```

Key points:
- Pages **must** use a default export
- Extend `PageProps` for the component props interface
- Loader data is passed directly as props to the component
- With hono-jsx renderer, use `class` instead of `className`

Reference: `examples/blog/app/page.tsx`
