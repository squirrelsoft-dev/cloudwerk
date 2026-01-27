/**
 * Blog post page - Static with dynamic segments (uses generateStaticParams)
 */
import type {
  PageProps,
  RouteConfig,
  GenerateStaticParamsFunction,
} from '@cloudwerk/core'

export const config: RouteConfig = {
  rendering: 'static',
}

/**
 * Generate static params for all blog posts.
 */
export const generateStaticParams: GenerateStaticParamsFunction<{ slug: string }> =
  async () => {
    // Simulate fetching posts from a CMS or database
    return [
      { slug: 'hello-world' },
      { slug: 'getting-started' },
      { slug: 'advanced-topics' },
    ]
  }

export default function PostPage({ params }: PageProps<{ slug: string }>) {
  return (
    <div data-page="post" data-slug={params.slug}>
      <h1>Post: {params.slug}</h1>
      <p>This is a statically generated blog post.</p>
    </div>
  )
}
