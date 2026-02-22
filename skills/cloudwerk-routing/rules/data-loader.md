---
title: Loader Function for Data Fetching
impact: HIGH
tags: loader, data, server-side, fetching
---

## Loader Function for Data Fetching

**Impact: HIGH**

The `loader()` export runs on the server before the component renders. It fetches data and returns it as props to the page or layout component.

**Incorrect (fetching data inside the component):**

```tsx
// app/page.tsx
// ❌ No loader — fetching in component doesn't work for SSR
export default function HomePage() {
  const [posts, setPosts] = useState([])

  useEffect(() => {
    fetch('/api/posts').then(r => r.json()).then(setPosts)
  }, [])

  return <div>{posts.map(p => <p>{p.title}</p>)}</div>
}
```

**Correct (loader export with typed return):**

```tsx
// app/posts/[slug]/page.tsx
import type { PageProps, LoaderArgs } from '@cloudwerk/core'
import { NotFoundError } from '@cloudwerk/core'
import { getPostBySlug, type Post } from '../../lib/db'
import { renderMarkdown } from '../../lib/markdown'

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
    <article>
      <h1>{post.title}</h1>
      <div>{html}</div>
    </article>
  )
}
```

Key points:
- Export an `async function loader(args: LoaderArgs)` from the page file
- `LoaderArgs` provides `{ params, request, context }`
- Return an object — its properties become component props
- Loaders run server-side only, never in the browser
- Layout loaders execute parent → child order
- Throw `NotFoundError` for 404 or `RedirectError` for redirects

Reference: `examples/blog/app/posts/[slug]/page.tsx`
