---
title: Catch-All Route Segments
impact: MEDIUM
tags: params, catch-all, wildcard, routing
---

## Catch-All Route Segments

**Impact: MEDIUM**

Catch-all segments use `[...paramName]` syntax to match any number of URL segments. The param value is a string containing the full matched path.

**Incorrect (using multiple nested dynamic segments for variable-depth routes):**

```
// ❌ Creating deeply nested folders for every possible path
app/docs/[section]/page.tsx
app/docs/[section]/[subsection]/page.tsx
app/docs/[section]/[subsection]/[article]/page.tsx
```

**Correct (catch-all segment):**

```
// ✅ Single catch-all handles any depth
app/docs/[...slug]/page.tsx
```

```tsx
// app/docs/[...slug]/page.tsx
import type { PageProps, LoaderArgs } from '@cloudwerk/core'

export async function loader({ params }: LoaderArgs) {
  // params.slug = "getting-started/installation" for /docs/getting-started/installation
  const doc = await getDoc(params.slug)
  return { doc }
}

export default function DocPage({ doc }: PageProps & { doc: Doc }) {
  return <article>{doc.content}</article>
}
```

Key points:
- `[...slug]` matches one or more segments: `/docs/a`, `/docs/a/b`, `/docs/a/b/c`
- The param value is the full matched path as a string
- Useful for CMS pages, documentation, or any variable-depth content
- File path `app/docs/[...slug]/page.tsx` → URL pattern `/docs/*`
