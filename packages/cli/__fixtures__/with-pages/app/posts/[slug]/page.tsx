/**
 * Test fixture: Posts page with redirect logic in loader.
 */

import type { LoaderArgs, PageProps } from '@cloudwerk/core'
import { RedirectError } from '@cloudwerk/core'

interface PostPageParams {
  slug: string
}

interface PostPageData {
  title: string
  content: string
}

/**
 * Loader that handles redirects for moved content.
 */
export async function loader({
  params,
}: LoaderArgs<PostPageParams>): Promise<PostPageData> {
  // Redirect old posts to new location
  if (params.slug === 'old-post') {
    throw new RedirectError('/posts/new-post', 301)
  }

  // Temporary redirect for maintenance
  if (params.slug === 'maintenance') {
    throw new RedirectError('/posts/temp-unavailable', 302)
  }

  // Simulate async data loading
  await Promise.resolve()

  return {
    title: `Post: ${params.slug}`,
    content: `Content for ${params.slug}`,
  }
}

export default function PostPage({
  params,
  title,
  content,
}: PageProps<PostPageParams> & PostPageData) {
  return (
    <article data-post-slug={params.slug}>
      <h1>{title}</h1>
      <p>{content}</p>
    </article>
  )
}
