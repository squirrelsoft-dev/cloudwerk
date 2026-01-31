import type { PageProps, LoaderArgs } from '@cloudwerk/core'
import { NotFoundError } from '@cloudwerk/core'
import { raw } from 'hono/html'
import { getPostBySlug, getAllSlugs, type Post } from '../../lib/db'
import { renderMarkdown } from '../../lib/markdown'

export const config = {
  rendering: 'static',
}

export async function generateStaticParams() {
  const slugs = await getAllSlugs()
  return slugs.map((slug) => ({ slug }))
}

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
  const date = post.published_at
    ? new Date(post.published_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null

  return (
    <div class="min-h-screen bg-gray-100 py-12 px-4">
      <div class="max-w-2xl mx-auto">
        <nav class="mb-8">
          <a href="/" class="text-blue-600 hover:underline">
            &larr; Back to all posts
          </a>
        </nav>

        <article class="bg-white rounded-lg shadow-md p-8">
          <header class="mb-8 border-b pb-6">
            <h1 class="text-3xl font-bold text-gray-900 mb-2">{post.title}</h1>
            {date && <time class="text-gray-500">{date}</time>}
          </header>

          <div class="prose prose-gray max-w-none">{raw(html)}</div>
        </article>
      </div>
    </div>
  )
}
