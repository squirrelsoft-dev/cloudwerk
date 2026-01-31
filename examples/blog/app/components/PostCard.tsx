import type { Post } from '../lib/db'

interface PostCardProps {
  post: Omit<Post, 'content'>
}

export default function PostCard({ post }: PostCardProps) {
  const date = post.published_at
    ? new Date(post.published_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null

  return (
    <article class="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      <a href={`/posts/${post.slug}`} class="block p-6">
        <h2 class="text-xl font-semibold text-gray-900 mb-2 hover:text-blue-600">
          {post.title}
        </h2>
        {post.excerpt && <p class="text-gray-600 mb-4">{post.excerpt}</p>}
        {date && <time class="text-sm text-gray-500">{date}</time>}
      </a>
    </article>
  )
}
