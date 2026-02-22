import { request } from '@cloudwerk/core/context'
import { queryAuditLog } from '@/services/flags/service'
import type { AuditEntry, AuditAction } from '@/lib/types'

export async function loader() {
  const url = new URL(request.url)

  const limit = parseInt(url.searchParams.get('limit') || '50', 10)
  const offset = parseInt(url.searchParams.get('offset') || '0', 10)
  const resourceType = url.searchParams.get('resourceType') as 'flag' | 'segment' | null
  const action = url.searchParams.get('action') as AuditAction | null

  const result = await queryAuditLog({
    limit,
    offset,
    resourceType: resourceType || undefined,
    action: action || undefined,
  })

  return {
    entries: result.entries,
    total: result.total,
    limit,
    offset,
    resourceType,
    action,
  }
}

interface PageProps {
  entries: AuditEntry[]
  total: number
  limit: number
  offset: number
  resourceType: 'flag' | 'segment' | null
  action: AuditAction | null
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function formatAction(action: AuditAction): { label: string; color: string } {
  const actions: Record<AuditAction, { label: string; color: string }> = {
    'flag.created': { label: 'Created', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' },
    'flag.updated': { label: 'Updated', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' },
    'flag.deleted': { label: 'Deleted', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' },
    'flag.enabled': { label: 'Enabled', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' },
    'flag.disabled': { label: 'Disabled', color: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400' },
    'flag.rules_updated': { label: 'Rules Updated', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' },
    'segment.created': { label: 'Created', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' },
    'segment.updated': { label: 'Updated', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' },
    'segment.deleted': { label: 'Deleted', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' },
  }
  return actions[action] || { label: action, color: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400' }
}

function AuditRow({ entry }: { entry: AuditEntry }) {
  const actionInfo = formatAction(entry.action)

  return (
    <div class="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
      <div class="flex items-start justify-between gap-4">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-3 mb-1">
            <span class={`px-2 py-0.5 rounded text-xs font-medium ${actionInfo.color}`}>
              {actionInfo.label}
            </span>
            <span class="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded capitalize">
              {entry.resourceType}
            </span>
            {entry.resourceKey && (
              <code class="text-xs px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">
                {entry.resourceKey}
              </code>
            )}
          </div>
          <div class="flex items-center gap-4 text-xs text-gray-500">
            <span>{formatDate(entry.timestamp)}</span>
            {entry.userEmail && <span>by {entry.userEmail}</span>}
          </div>
          {entry.changes && Object.keys(entry.changes).length > 0 && (
            <div class="mt-2 text-xs">
              <details class="cursor-pointer">
                <summary class="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                  View changes ({Object.keys(entry.changes).length} field{Object.keys(entry.changes).length !== 1 ? 's' : ''})
                </summary>
                <div class="mt-2 p-2 bg-gray-50 dark:bg-gray-900 rounded">
                  {Object.entries(entry.changes).map(([key, change]) => (
                    <div key={key} class="mb-1 last:mb-0">
                      <span class="font-medium">{key}:</span>{' '}
                      <span class="text-red-600 dark:text-red-400 line-through">
                        {JSON.stringify(change.old)}
                      </span>{' '}
                      <span class="text-gray-400">{'->'}</span>{' '}
                      <span class="text-green-600 dark:text-green-400">
                        {JSON.stringify(change.new)}
                      </span>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AuditPage({
  entries,
  total,
  limit,
  offset,
  resourceType,
  action,
}: PageProps) {
  const currentPage = Math.floor(offset / limit) + 1
  const totalPages = Math.ceil(total / limit)
  const hasPrev = offset > 0
  const hasNext = offset + limit < total

  const buildUrl = (newOffset: number) => {
    const params = new URLSearchParams()
    params.set('limit', String(limit))
    params.set('offset', String(newOffset))
    if (resourceType) params.set('resourceType', resourceType)
    if (action) params.set('action', action)
    return `/dashboard/audit?${params.toString()}`
  }

  return (
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page header */}
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 class="text-2xl font-bold">Audit Log</h1>
          <p class="text-gray-600 dark:text-gray-400 mt-1">
            Track changes to flags and segments
          </p>
        </div>
      </div>

      {/* Filters */}
      <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <form method="get" class="flex flex-wrap items-center gap-4">
          <input type="hidden" name="limit" value={limit} />
          <input type="hidden" name="offset" value="0" />

          <div>
            <label for="resourceType" class="block text-xs font-medium text-gray-500 mb-1">
              Resource Type
            </label>
            <select
              id="resourceType"
              name="resourceType"
              class="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
            >
              <option value="">All</option>
              <option value="flag" selected={resourceType === 'flag'}>Flags</option>
              <option value="segment" selected={resourceType === 'segment'}>Segments</option>
            </select>
          </div>

          <div>
            <label for="action" class="block text-xs font-medium text-gray-500 mb-1">
              Action
            </label>
            <select
              id="action"
              name="action"
              class="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
            >
              <option value="">All</option>
              <option value="flag.created" selected={action === 'flag.created'}>Flag Created</option>
              <option value="flag.updated" selected={action === 'flag.updated'}>Flag Updated</option>
              <option value="flag.deleted" selected={action === 'flag.deleted'}>Flag Deleted</option>
              <option value="flag.enabled" selected={action === 'flag.enabled'}>Flag Enabled</option>
              <option value="flag.disabled" selected={action === 'flag.disabled'}>Flag Disabled</option>
              <option value="flag.rules_updated" selected={action === 'flag.rules_updated'}>Flag Rules Updated</option>
              <option value="segment.created" selected={action === 'segment.created'}>Segment Created</option>
              <option value="segment.updated" selected={action === 'segment.updated'}>Segment Updated</option>
              <option value="segment.deleted" selected={action === 'segment.deleted'}>Segment Deleted</option>
            </select>
          </div>

          <div class="self-end">
            <button
              type="submit"
              class="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              Filter
            </button>
          </div>
        </form>
      </div>

      {/* Stats */}
      <div class="mb-4 text-sm text-gray-500">
        Showing {entries.length} of {total} entries
      </div>

      {/* Audit entries */}
      <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
        {entries.length === 0 ? (
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
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <h3 class="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">
              No audit entries
            </h3>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Changes to flags and segments will appear here.
            </p>
          </div>
        ) : (
          <div class="divide-y divide-gray-200 dark:divide-gray-700">
            {entries.map((entry) => (
              <AuditRow key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div class="flex items-center justify-between">
          <div class="text-sm text-gray-500">
            Page {currentPage} of {totalPages}
          </div>
          <div class="flex items-center gap-2">
            {hasPrev ? (
              <a
                href={buildUrl(offset - limit)}
                class="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Previous
              </a>
            ) : (
              <button
                disabled
                class="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 text-gray-400 rounded-lg cursor-not-allowed"
              >
                Previous
              </button>
            )}
            {hasNext ? (
              <a
                href={buildUrl(offset + limit)}
                class="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Next
              </a>
            ) : (
              <button
                disabled
                class="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 text-gray-400 rounded-lg cursor-not-allowed"
              >
                Next
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
