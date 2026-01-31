import type { PageProps, LoaderArgs } from '@cloudwerk/core'
import { NotFoundError } from '@cloudwerk/core'
import { getLinkByCode, type Link } from '../../lib/db'

interface StatsLoaderData {
  link: Link
  shortUrl: string
}

export async function loader({ params, request }: LoaderArgs<{ code: string }>): Promise<StatsLoaderData> {
  const link = await getLinkByCode(params.code)
  if (!link) throw new NotFoundError()

  const origin = new URL(request.url).origin
  return {
    link,
    shortUrl: `${origin}/${link.code}`,
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function StatsPage({ link, shortUrl }: PageProps & StatsLoaderData) {
  return (
    <main class="flex flex-col items-center justify-center min-h-screen p-8">
      {/* Header */}
      <div class="mb-8">
        <a href="/" class="text-4xl font-bold bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent hover:opacity-80 transition-opacity">
          Linkly
        </a>
      </div>

      <h2 class="text-2xl font-semibold text-gray-700 dark:text-gray-300 mb-8">
        Link Statistics
      </h2>

      {/* Stats Card */}
      <div class="w-full max-w-lg bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-6">
        {/* Click Count */}
        <div class="text-center py-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg">
          <div class="text-5xl font-bold text-blue-600 dark:text-blue-400">
            {link.clicks.toLocaleString()}
          </div>
          <div class="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {link.clicks === 1 ? 'click' : 'clicks'}
          </div>
        </div>

        {/* Short URL */}
        <div>
          <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
            Short URL
          </label>
          <div class="flex items-center gap-2">
            <a
              href={shortUrl}
              target="_blank"
              rel="noopener noreferrer"
              class="flex-1 text-blue-600 dark:text-blue-400 hover:underline break-all"
            >
              {shortUrl}
            </a>
            <button
              onclick={`navigator.clipboard.writeText('${shortUrl}');this.textContent='Copied!';setTimeout(()=>this.textContent='Copy',2000)`}
              class="shrink-0 px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded transition-colors"
            >
              Copy
            </button>
          </div>
        </div>

        {/* Original URL */}
        <div>
          <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
            Original URL
          </label>
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            class="block text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 break-all transition-colors"
          >
            {link.url}
          </a>
        </div>

        {/* Created Date */}
        <div>
          <label class="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
            Created
          </label>
          <div class="text-gray-700 dark:text-gray-300">
            {formatDate(link.created_at)}
          </div>
        </div>
      </div>

      {/* Back Link */}
      <a
        href="/"
        class="mt-8 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
      >
        &larr; Create another link
      </a>
    </main>
  )
}
