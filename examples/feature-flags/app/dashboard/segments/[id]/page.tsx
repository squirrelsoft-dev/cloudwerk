import { getSegment } from '@/services/flags/service'
import type { Segment, Condition } from '@/lib/types'
import { NotFoundError, type LoaderArgs } from '@cloudwerk/core/runtime'
import DeleteSegmentButton from '@/components/DeleteSegmentButton'

export async function loader({ params }: LoaderArgs) {
  const id = params.id
  if (!id) {
    throw new NotFoundError('Segment not found')
  }

  const segment = await getSegment(id)
  if (!segment) {
    throw new NotFoundError('Segment not found')
  }

  return { segment }
}

interface PageProps {
    segment: Segment
}

function formatDate(dateString: string): string {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

function formatOperator(op: string): string {
    const labels: Record<string, string> = {
        eq: 'equals',
        neq: 'does not equal',
        gt: 'greater than',
        gte: 'greater than or equal',
        lt: 'less than',
        lte: 'less than or equal',
        contains: 'contains',
        not_contains: 'does not contain',
        starts_with: 'starts with',
        ends_with: 'ends with',
        in: 'is in',
        not_in: 'is not in',
        matches: 'matches regex',
        semver_eq: 'semver equals',
        semver_gt: 'semver greater than',
        semver_gte: 'semver greater than or equal',
        semver_lt: 'semver less than',
        semver_lte: 'semver less than or equal',
    }
    return labels[op] || op
}

function ConditionRow({ condition, index }: { condition: Condition; index: number }) {
    const value = Array.isArray(condition.value)
        ? condition.value.join(', ')
        : String(condition.value)

    return (
        <div class="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            {index > 0 && (
                <span class="text-xs font-medium text-gray-400 uppercase">AND</span>
            )}
            <code class="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-sm font-medium">
                {condition.attribute}
            </code>
            <span class="text-sm text-gray-500">
                {formatOperator(condition.operator)}
            </span>
            <code class="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-sm">
                {value}
            </code>
        </div>
    )
}

export default function SegmentDetailPage({ segment }: PageProps) {
    return (
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div class="mb-8">
                <a
                    href="/dashboard/segments"
                    class="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Segments
                </a>
            </div>

            {/* Header */}
            <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
                <div>
                    <h1 class="text-2xl font-bold mb-2">{segment.name}</h1>
                    <code class="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-sm">
                        {segment.key}
                    </code>
                </div>
                <div class="flex items-center gap-3">
                    <a
                        href={`/dashboard/segments/${segment.id}/edit`}
                        class="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
                    >
                        Edit
                    </a>
                    <DeleteSegmentButton segmentId={segment.id} />
                </div>
            </div>

            {/* Description */}
            {segment.description && (
                <div class="mb-8">
                    <p class="text-gray-600 dark:text-gray-400">{segment.description}</p>
                </div>
            )}

            {/* Conditions */}
            <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
                <div class="flex items-center justify-between mb-4">
                    <h2 class="text-lg font-medium">Conditions</h2>
                    <span class="text-sm text-gray-500">
                        {segment.conditions.length}{' '}
                        {segment.conditions.length === 1 ? 'condition' : 'conditions'}
                    </span>
                </div>

                {segment.conditions.length === 0 ? (
                    <div class="text-center py-8">
                        <p class="text-sm text-gray-500">No conditions defined for this segment.</p>
                    </div>
                ) : (
                    <div class="space-y-2">
                        {segment.conditions.map((condition, index) => (
                            <ConditionRow key={index} condition={condition} index={index} />
                        ))}
                    </div>
                )}

                <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <p class="text-sm text-gray-500">
                        To use this segment in a flag rule, add a condition with attribute{' '}
                        <code class="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">$segment</code>{' '}
                        operator{' '}
                        <code class="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">in</code>{' '}
                        value{' '}
                        <code class="px-1 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs">
                            {segment.key}
                        </code>
                    </p>
                </div>
            </div>

            {/* Metadata */}
            <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h2 class="text-lg font-medium mb-4">Metadata</h2>
                <dl class="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <dt class="text-gray-500">Created</dt>
                        <dd class="font-medium">{formatDate(segment.createdAt)}</dd>
                    </div>
                    <div>
                        <dt class="text-gray-500">Updated</dt>
                        <dd class="font-medium">{formatDate(segment.updatedAt)}</dd>
                    </div>
                    <div>
                        <dt class="text-gray-500">Segment ID</dt>
                        <dd class="font-mono text-xs">{segment.id}</dd>
                    </div>
                </dl>
            </div>

        </div>
    )
}
