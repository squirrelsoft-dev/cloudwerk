import { getFlag } from '@/services/flags/service'
import type { Flag, TargetingRule, Condition } from '@/lib/types'
import { NotFoundError, type LoaderArgs } from '@cloudwerk/core/runtime'
import FlagActions from '@/components/FlagActions'

export async function loader({ params }: LoaderArgs) {
  const id = params.id
  if (!id) {
    throw new NotFoundError('Flag not found')
  }

  const flag = await getFlag(id)
  if (!flag) {
    throw new NotFoundError('Flag not found')
  }

  return { flag }
}

interface PageProps {
    flag: Flag
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

function ConditionDisplay({ condition }: { condition: Condition }) {
    const value = Array.isArray(condition.value)
        ? condition.value.join(', ')
        : String(condition.value)

    return (
        <span class="text-sm">
            <code class="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                {condition.attribute}
            </code>
            {' '}
            <span class="text-gray-500">{formatOperator(condition.operator)}</span>
            {' '}
            <code class="px-1 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs">
                {value}
            </code>
        </span>
    )
}

function RuleCard({ rule, index }: { rule: TargetingRule; index: number }) {
    return (
        <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                    <span class="text-sm font-medium text-gray-500">Rule {index + 1}</span>
                    {rule.name && (
                        <span class="text-sm text-gray-700 dark:text-gray-300">{rule.name}</span>
                    )}
                </div>
                {rule.percentage !== undefined && (
                    <span class="text-xs px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded">
                        {rule.percentage}% rollout
                    </span>
                )}
            </div>

            {rule.conditions.length > 0 ? (
                <div class="space-y-2 mb-3">
                    {rule.conditions.map((condition, i) => (
                        <div key={i} class="flex items-center gap-2">
                            {i > 0 && <span class="text-xs text-gray-400">AND</span>}
                            <ConditionDisplay condition={condition} />
                        </div>
                    ))}
                </div>
            ) : (
                <p class="text-sm text-gray-500 mb-3">All users match this rule</p>
            )}

            <div class="flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-gray-700">
                <span class="text-sm text-gray-500">Returns:</span>
                <code class="px-2 py-1 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded text-sm">
                    {JSON.stringify(rule.value)}
                </code>
            </div>
        </div>
    )
}

export default function FlagDetailPage({ flag }: PageProps) {
    return (
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div class="mb-8">
                <a
                    href="/dashboard"
                    class="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Flags
                </a>
            </div>

            {/* Header */}
            <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
                <div>
                    <div class="flex items-center gap-3 mb-2">
                        <h1 class="text-2xl font-bold">{flag.name}</h1>
                        <span
                            class={`px-2.5 py-1 rounded-full text-xs font-medium ${flag.enabled
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                                }`}
                        >
                            {flag.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                    </div>
                    <div class="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                        <code class="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
                            {flag.key}
                        </code>
                        <span class="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">
                            {flag.type}
                        </span>
                    </div>
                </div>
                <FlagActions flagId={flag.id} enabled={flag.enabled} />
            </div>

            {/* Description */}
            {flag.description && (
                <div class="mb-8">
                    <p class="text-gray-600 dark:text-gray-400">{flag.description}</p>
                </div>
            )}

            {/* Tags */}
            {flag.tags.length > 0 && (
                <div class="flex items-center gap-2 mb-8">
                    {flag.tags.map((tag) => (
                        <span
                            key={tag}
                            class="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-sm"
                        >
                            {tag}
                        </span>
                    ))}
                </div>
            )}

            {/* Default Value */}
            <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
                <h2 class="text-lg font-medium mb-4">Default Value</h2>
                <p class="text-sm text-gray-500 mb-3">
                    This value is returned when the flag is disabled or no targeting rules match.
                </p>
                <code class="block px-4 py-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-sm font-mono">
                    {JSON.stringify(flag.defaultValue, null, 2)}
                </code>
            </div>

            {/* Targeting Rules */}
            <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
                <div class="flex items-center justify-between mb-4">
                    <h2 class="text-lg font-medium">Targeting Rules</h2>
                    <span class="text-sm text-gray-500">
                        {flag.rules.length} {flag.rules.length === 1 ? 'rule' : 'rules'}
                    </span>
                </div>

                {flag.rules.length === 0 ? (
                    <div class="text-center py-8">
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
                        <h3 class="mt-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                            No targeting rules
                        </h3>
                        <p class="mt-1 text-sm text-gray-500">
                            All evaluations will return the default value.
                        </p>
                    </div>
                ) : (
                    <div class="space-y-4">
                        {flag.rules.map((rule, index) => (
                            <RuleCard key={rule.id} rule={rule} index={index} />
                        ))}
                    </div>
                )}
            </div>

            {/* Metadata */}
            <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h2 class="text-lg font-medium mb-4">Metadata</h2>
                <dl class="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <dt class="text-gray-500">Created</dt>
                        <dd class="font-medium">{formatDate(flag.createdAt)}</dd>
                    </div>
                    <div>
                        <dt class="text-gray-500">Updated</dt>
                        <dd class="font-medium">{formatDate(flag.updatedAt)}</dd>
                    </div>
                    <div>
                        <dt class="text-gray-500">Flag ID</dt>
                        <dd class="font-mono text-xs">{flag.id}</dd>
                    </div>
                </dl>
            </div>

        </div>
    )
}
