---
title: Cloudflare Binding Access
impact: HIGH
tags: bindings, d1, kv, r2, getBinding
---

## Cloudflare Binding Access

**Impact: HIGH**

Cloudwerk provides typed access to Cloudflare bindings (D1, KV, R2) via the `getBinding()` function and pre-configured binding helpers. These connect to your Cloudflare resources defined in `wrangler.toml`.

**Incorrect (accessing bindings from Hono context directly):**

```typescript
// ❌ Accessing env directly from Hono context
export async function GET(c: Context) {
  const db = c.env.DB
  const result = await db.prepare('SELECT * FROM posts').all()
  return c.json(result)
}
```

**Correct (using Cloudwerk binding helpers):**

```typescript
// D1 Database — using pre-configured DB binding
import { DB } from '@cloudwerk/core/bindings'

export async function getPosts(): Promise<Post[]> {
  const result = await DB
    .prepare('SELECT id, slug, title FROM posts WHERE published_at IS NOT NULL ORDER BY published_at DESC')
    .all<Post>()
  return result.results
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  return DB
    .prepare('SELECT * FROM posts WHERE slug = ?')
    .bind(slug)
    .first<Post>()
}

// KV Namespace — using pre-configured binding
import { LINKLY_CACHE } from '@cloudwerk/core/bindings'

export async function getCachedUrl(code: string): Promise<string | null> {
  return LINKLY_CACHE.get(`url:${code}`)
}

export async function cacheUrl(code: string, url: string): Promise<void> {
  await LINKLY_CACHE.put(`url:${code}`, url, {
    expirationTtl: 3600,
  })
}

// R2 Bucket — using getBinding() for custom names
import { getBinding } from '@cloudwerk/core/bindings'

export async function GET() {
  const BUCKET = getBinding<R2Bucket>('GALLERY_BUCKET')
  const result = await BUCKET.list()
  return json({ images: result.objects })
}
```

Key points:
- `DB` — Pre-configured D1 database binding
- `LINKLY_CACHE` etc — Named KV bindings imported directly
- `getBinding<T>('NAME')` — Generic binding access with type parameter
- Binding names must match `wrangler.toml` configuration
- Use `getContext().env` for access to all bindings via the context object

Reference: `examples/blog/app/lib/db.ts`, `examples/linkly/app/lib/cache.ts`, `examples/gallery/app/r2/route.ts`
