import { DB } from '@cloudwerk/core/bindings'

export interface Post {
  id: string
  slug: string
  title: string
  excerpt: string | null
  content: string
  published_at: string | null
  created_at: string
}

export async function getPosts(): Promise<Post[]> {
  const result = await DB
    .prepare(
      'SELECT id, slug, title, excerpt, published_at, created_at FROM posts WHERE published_at IS NOT NULL ORDER BY published_at DESC'
    )
    .all<Post>()
  return result.results
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const result = await DB
    .prepare('SELECT * FROM posts WHERE slug = ?')
    .bind(slug)
    .first<Post>()
  return result
}

export async function getAllSlugs(): Promise<string[]> {
  const result = await DB
    .prepare('SELECT slug FROM posts WHERE published_at IS NOT NULL')
    .all<{ slug: string }>()
  return result.results.map((r: { slug: string }) => r.slug)
}
