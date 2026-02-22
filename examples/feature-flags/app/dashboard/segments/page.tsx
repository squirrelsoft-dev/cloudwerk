import { listSegments } from '@/services/flags/service'
import type { Segment } from '@/lib/types'

export async function loader() {
  const segments = await listSegments()
  return { segments }
}

interface PageProps {
  segments: Segment[]
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function SegmentsPage({ segments }: PageProps) {
  return (
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page header */}
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 class="text-2xl font-bold">Segments</h1>
          <p class="text-gray-600 dark:text-gray-400 mt-1">
            Create reusable user segments for targeting
          </p>
        </div>
        <a
          href="/dashboard/segments/new"
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
          Create Segment
        </a>
      </div>

      {/* Stats */}
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div class="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
          <div class="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Segments</div>
          <div class="text-3xl font-bold">{segments.length}</div>
        </div>
        <div class="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
          <div class="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Conditions</div>
          <div class="text-3xl font-bold">
            {segments.reduce((sum, s) => sum + s.conditions.length, 0)}
          </div>
        </div>
      </div>

      {/* Segments list */}
      <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {segments.length === 0 ? (
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
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <h3 class="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">
              No segments yet
            </h3>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Segments let you define reusable targeting criteria for your feature flags.
            </p>
            <a
              href="/dashboard/segments/new"
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
              Create Segment
            </a>
          </div>
        ) : (
          <div class="divide-y divide-gray-200 dark:divide-gray-700">
            {segments.map((segment) => (
              <a
                key={segment.id}
                href={`/dashboard/segments/${segment.id}`}
                class="block px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div class="flex items-start justify-between gap-4">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-3 mb-1">
                      <h3 class="font-medium truncate">{segment.name}</h3>
                      <code class="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
                        {segment.key}
                      </code>
                    </div>
                    <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      {segment.description || 'No description'}
                    </p>
                    <div class="flex items-center gap-4 text-xs text-gray-500">
                      <div>
                        {segment.conditions.length}{' '}
                        {segment.conditions.length === 1 ? 'condition' : 'conditions'}
                      </div>
                      <div>Created {formatDate(segment.createdAt)}</div>
                    </div>
                  </div>
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
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
