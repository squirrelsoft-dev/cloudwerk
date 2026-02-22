import { listFlags } from '@/services/flags/service'
import type { Flag as FlagType } from '@/lib/types'

export async function loader() {
  const flags = await listFlags()
  return { flags }
}

interface PageProps {
  flags: FlagType[]
}

function getPercentageRollout(flag: FlagType): number | null {
  // Look for a rule with a percentage rollout
  for (const rule of flag.rules) {
    if (rule.percentage !== undefined && rule.percentage > 0 && rule.percentage < 100) {
      return rule.percentage
    }
  }
  return null
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function FlagsPage({ flags }: PageProps) {
  return (
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page header */}
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 class="text-2xl font-bold">All Feature Flags</h1>
          <p class="text-gray-600 dark:text-gray-400 mt-1">
            Manage your feature flags and rollouts
          </p>
        </div>
        <a
          href="/dashboard/flags/new"
          class="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
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

      {/* Flags list */}
      <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div class="flex items-center gap-4">
            <input
              type="search"
              placeholder="Search flags..."
              class="flex-1 max-w-xs px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            />
            <select class="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700">
              <option>All types</option>
              <option value="boolean">Boolean</option>
              <option value="string">String</option>
              <option value="number">Number</option>
              <option value="json">JSON</option>
            </select>
          </div>
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
            {flags.map((flag) => {
              const rollout = getPercentageRollout(flag)
              return (
                <a
                  key={flag.id}
                  href={`/dashboard/flags/${flag.id}`}
                  class="block px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div class="flex items-start justify-between gap-4">
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-3 mb-1">
                        <h3 class="font-medium truncate">{flag.name}</h3>
                        <code class="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
                          {flag.key}
                        </code>
                        <span class="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">
                          {flag.type}
                        </span>
                        <span
                          class={`text-xs px-2 py-0.5 rounded ${
                            flag.enabled
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                          }`}
                        >
                          {flag.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        {flag.description || 'No description'}
                      </p>
                      <div class="flex items-center gap-4 text-xs">
                        {flag.tags.length > 0 && (
                          <div class="flex items-center gap-1">
                            {flag.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                class="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded"
                              >
                                {tag}
                              </span>
                            ))}
                            {flag.tags.length > 3 && (
                              <span class="text-gray-500">+{flag.tags.length - 3}</span>
                            )}
                          </div>
                        )}
                        {rollout !== null && (
                          <div class="text-gray-500">{rollout}% rollout</div>
                        )}
                        <div class="text-gray-500">
                          {flag.rules.length} {flag.rules.length === 1 ? 'rule' : 'rules'}
                        </div>
                        <div class="text-gray-500">Created {formatDate(flag.createdAt)}</div>
                      </div>
                    </div>
                    <div class="flex items-center">
                      <svg
                        class="w-5 h-5 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </div>
                </a>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
