---
title: PageProps Interface
impact: HIGH
tags: component, page, props, loader
---

## PageProps Interface

**Impact: HIGH**

Page components receive their props from the `loader()` function return value. Extend `PageProps` with your loader data types for type-safe component props.

**Incorrect (untyped or wrong props):**

```tsx
// ❌ Using any or untyped props
export default function PostPage(props: any) {
  return <h1>{props.post.title}</h1>
}

// ❌ Not extending PageProps
export default function PostPage({ post }: { post: Post }) {
  return <h1>{post.title}</h1>
}
```

**Correct (extending PageProps with loader data):**

```tsx
import type { PageProps, LoaderArgs } from '@cloudwerk/core'
import { NotFoundError } from '@cloudwerk/core'
import { getPostBySlug, type Post } from '../../lib/db'

export async function loader({ params }: LoaderArgs) {
  const post = await getPostBySlug(params.slug)
  if (!post) {
    throw new NotFoundError(`Post not found: ${params.slug}`)
  }
  const html = renderMarkdown(post.content)
  return { post, html }
}

interface PostPageProps extends PageProps {
  post: Post
  html: string
}

export default function PostPage({ post, html }: PostPageProps) {
  return (
    <article class="bg-white rounded-lg shadow-md p-8">
      <h1 class="text-3xl font-bold">{post.title}</h1>
      <div class="prose">{html}</div>
    </article>
  )
}
```

Key points:
- Always `extends PageProps` for your page component props
- `PageProps` includes base route props (params, searchParams)
- Add loader return properties to your extended interface
- For actions, add optional `actionData` property
- The loader return type and component props must match

Reference: `examples/blog/app/posts/[slug]/page.tsx`
