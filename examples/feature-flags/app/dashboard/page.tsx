import { listFlags } from '@/services/flags/service'
import type { Flag as FlagType } from '@/lib/types'
import FlagToggle from '@/components/FlagToggle'

export async function loader() {
  const flags = await listFlags()
  return { flags }
}

interface PageProps {
  flags: FlagType[]
}

export default function DashboardPage({ flags }: PageProps) {
  const enabledCount = flags.filter((f) => f.enabled).length
  const disabledCount = flags.length - enabledCount

  return (
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page header */}
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 class="text-2xl font-bold">Dashboard</h1>
          <p class="text-gray-600 dark:text-gray-400 mt-1">Quick feature toggle controls</p>
        </div>
        <a
          href="/dashboard/flags"
          class="inline-flex items-center gap-2 px-4 py-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors font-medium"
        >
          View all flags
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </a>
      </div>

      {/* Stats */}
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div class="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
          <div class="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Flags</div>
          <div class="text-3xl font-bold">{flags.length}</div>
        </div>
        <div class="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
          <div class="text-sm text-gray-600 dark:text-gray-400 mb-1">Enabled</div>
          <div class="text-3xl font-bold text-green-600">{enabledCount}</div>
        </div>
        <div class="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
          <div class="text-sm text-gray-600 dark:text-gray-400 mb-1">Disabled</div>
          <div class="text-3xl font-bold text-gray-500">{disabledCount}</div>
        </div>
      </div>

      {/* Flags list - simplified for quick toggling */}
      <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 class="font-semibold">Feature Toggles</h2>
        </div>

        {flags.length === 0 ? (
          <div class="px-6 py-12 text-center">
            <svg
              class="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"
              />
            </svg>
            <h3 class="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">No flags yet</h3>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Get started by creating your first feature flag.
            </p>
            <a
              href="/dashboard/flags/new"
              class="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Create Flag
            </a>
          </div>
        ) : (
          <div class="divide-y divide-gray-200 dark:divide-gray-700">
            {flags.map((flag) => (
              <div key={flag.id} class="px-6 py-4 flex items-center justify-between gap-4">
                <div class="flex items-center gap-4 min-w-0">
                  <FlagToggle flagId={flag.id} enabled={flag.enabled} />
                  <div class="min-w-0">
                    <div class="flex items-center gap-2 mb-0.5">
                      <h3 class="font-medium truncate">{flag.name}</h3>
                      <code class="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded flex-shrink-0">
                        {flag.key}
                      </code>
                    </div>
                    {flag.description && (
                      <p class="text-sm text-gray-600 dark:text-gray-400 truncate">
                        {flag.description}
                      </p>
                    )}
                  </div>
                </div>
                <a
                  href={`/dashboard/flags/${flag.id}/edit`}
                  class="flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  title="Edit flag"
                >
                  <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </a>
              </div>
            ))}
          </div>
        )}

        {flags.length > 0 && (
          <div class="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <a
              href="/dashboard/flags"
              class="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
            >
              View all flags for full management →
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
