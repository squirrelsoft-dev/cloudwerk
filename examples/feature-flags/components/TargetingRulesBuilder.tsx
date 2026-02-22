'use client'

import { useState } from 'hono/jsx'
import type { TargetingRule, Condition, FlagType, Operator, Segment } from '@/lib/types'

interface TargetingRulesBuilderProps {
    rules: TargetingRule[]
    onChange: (rules: TargetingRule[]) => void
    flagType: FlagType
    segments: Segment[]
}

interface RuleCondition extends Condition {
    id: number
}

interface RuleState {
    id: string
    name: string
    conditions: RuleCondition[]
    percentage: number | null
    value: unknown
}

const operators: { value: Operator; label: string; description?: string }[] = [
    { value: 'eq', label: 'equals' },
    { value: 'neq', label: 'does not equal' },
    { value: 'gt', label: 'greater than' },
    { value: 'gte', label: 'greater than or equal' },
    { value: 'lt', label: 'less than' },
    { value: 'lte', label: 'less than or equal' },
    { value: 'contains', label: 'contains' },
    { value: 'not_contains', label: 'does not contain' },
    { value: 'starts_with', label: 'starts with' },
    { value: 'ends_with', label: 'ends with' },
    { value: 'in', label: 'is in', description: 'comma-separated values' },
    { value: 'not_in', label: 'is not in', description: 'comma-separated values' },
    { value: 'matches', label: 'matches regex' },
    { value: 'semver_eq', label: 'semver equals' },
    { value: 'semver_gt', label: 'semver greater than' },
    { value: 'semver_gte', label: 'semver greater than or equal' },
    { value: 'semver_lt', label: 'semver less than' },
    { value: 'semver_lte', label: 'semver less than or equal' },
]

const segmentOperators: { value: Operator; label: string }[] = [
    { value: 'in', label: 'is in segment' },
    { value: 'not_in', label: 'is not in segment' },
]

const commonAttributes = [
    'userId',
    'email',
    'country',
    'device',
    'platform',
    'version',
    'environment',
]

let conditionIdCounter = 0

function generateRuleId(): string {
    return crypto.randomUUID()
}

function convertToRuleState(rule: TargetingRule): RuleState {
    return {
        id: rule.id,
        name: rule.name || '',
        conditions: rule.conditions.map(c => ({
            ...c,
            id: ++conditionIdCounter,
            value: Array.isArray(c.value) ? c.value.join(', ') : String(c.value),
        })) as RuleCondition[],
        percentage: rule.percentage ?? null,
        value: rule.value,
    }
}

function convertToTargetingRule(state: RuleState): TargetingRule {
    return {
        id: state.id,
        name: state.name || undefined,
        conditions: state.conditions.map(c => {
            let val: Condition['value'] = c.value

            if (c.operator === 'in' || c.operator === 'not_in') {
                val = String(c.value).split(',').map(v => v.trim()).filter(Boolean)
            } else if (val === 'true') {
                val = true
            } else if (val === 'false') {
                val = false
            } else if (!isNaN(Number(val)) && String(val).trim() !== '') {
                val = Number(val)
            }

            return {
                attribute: c.attribute,
                operator: c.operator,
                value: val,
            }
        }),
        percentage: state.percentage ?? undefined,
        value: state.value,
    }
}

export default function TargetingRulesBuilder({
    rules,
    onChange,
    flagType,
    segments,
}: TargetingRulesBuilderProps) {
    const [ruleStates, setRuleStates] = useState<RuleState[]>(
        rules.map(convertToRuleState)
    )

    const updateRules = (newStates: RuleState[]) => {
        setRuleStates(newStates)
        onChange(newStates.map(convertToTargetingRule))
    }

    const addRule = () => {
        const defaultValue = flagType === 'boolean' ? true : flagType === 'number' ? 0 : ''
        const newRule: RuleState = {
            id: generateRuleId(),
            name: '',
            conditions: [],
            percentage: null,
            value: defaultValue,
        }
        updateRules([...ruleStates, newRule])
    }

    const removeRule = (ruleId: string) => {
        updateRules(ruleStates.filter(r => r.id !== ruleId))
    }

    const moveRule = (index: number, direction: 'up' | 'down') => {
        const newIndex = direction === 'up' ? index - 1 : index + 1
        if (newIndex < 0 || newIndex >= ruleStates.length) return

        const newStates = [...ruleStates]
        const temp = newStates[index]
        newStates[index] = newStates[newIndex]
        newStates[newIndex] = temp
        updateRules(newStates)
    }

    const updateRule = (ruleId: string, updates: Partial<RuleState>) => {
        updateRules(
            ruleStates.map(r => (r.id === ruleId ? { ...r, ...updates } : r))
        )
    }

    const addCondition = (ruleId: string) => {
        updateRules(
            ruleStates.map(r => {
                if (r.id !== ruleId) return r
                return {
                    ...r,
                    conditions: [
                        ...r.conditions,
                        {
                            id: ++conditionIdCounter,
                            attribute: '',
                            operator: 'eq' as Operator,
                            value: '',
                        },
                    ],
                }
            })
        )
    }

    const addSegmentCondition = (ruleId: string, segmentKey: string) => {
        updateRules(
            ruleStates.map(r => {
                if (r.id !== ruleId) return r
                return {
                    ...r,
                    conditions: [
                        ...r.conditions,
                        {
                            id: ++conditionIdCounter,
                            attribute: '$segment',
                            operator: 'in' as Operator,
                            value: segmentKey,
                        },
                    ],
                }
            })
        )
    }

    const removeCondition = (ruleId: string, conditionId: number) => {
        updateRules(
            ruleStates.map(r => {
                if (r.id !== ruleId) return r
                return {
                    ...r,
                    conditions: r.conditions.filter(c => c.id !== conditionId),
                }
            })
        )
    }

    const updateCondition = (
        ruleId: string,
        conditionId: number,
        updates: Partial<RuleCondition>
    ) => {
        updateRules(
            ruleStates.map(r => {
                if (r.id !== ruleId) return r
                return {
                    ...r,
                    conditions: r.conditions.map(c =>
                        c.id === conditionId ? { ...c, ...updates } : c
                    ),
                }
            })
        )
    }

    const renderValueInput = (rule: RuleState) => {
        const baseClass =
            'w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none'

        if (flagType === 'boolean') {
            return (
                <select
                    value={String(rule.value)}
                    onChange={(e) =>
                        updateRule(rule.id, {
                            value: (e.target as HTMLSelectElement).value === 'true',
                        })
                    }
                    class={baseClass}
                >
                    <option value="true">true</option>
                    <option value="false">false</option>
                </select>
            )
        }

        if (flagType === 'number') {
            return (
                <input
                    type="number"
                    value={rule.value as number}
                    onInput={(e) =>
                        updateRule(rule.id, {
                            value: parseFloat((e.target as HTMLInputElement).value) || 0,
                        })
                    }
                    class={baseClass}
                />
            )
        }

        if (flagType === 'json') {
            return (
                <textarea
                    rows={2}
                    value={
                        typeof rule.value === 'string'
                            ? rule.value
                            : JSON.stringify(rule.value, null, 2)
                    }
                    onInput={(e) => {
                        const val = (e.target as HTMLTextAreaElement).value
                        try {
                            updateRule(rule.id, { value: JSON.parse(val) })
                        } catch {
                            updateRule(rule.id, { value: val })
                        }
                    }}
                    class={`${baseClass} font-mono resize-none`}
                />
            )
        }

        return (
            <input
                type="text"
                value={rule.value as string}
                onInput={(e) =>
                    updateRule(rule.id, {
                        value: (e.target as HTMLInputElement).value,
                    })
                }
                class={baseClass}
            />
        )
    }

    return (
        <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <div class="flex items-center justify-between mb-4">
                <div>
                    <h2 class="text-lg font-medium">Targeting Rules</h2>
                    <p class="text-sm text-gray-500 mt-1">
                        Rules are evaluated in order. First matching rule returns its value.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={addRule}
                    class="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M12 4v16m8-8H4"
                        />
                    </svg>
                    Add Rule
                </button>
            </div>

            {ruleStates.length === 0 ? (
                <div class="text-center py-8 text-gray-500">
                    <p class="text-sm">
                        No targeting rules defined. The default value will be returned for all
                        users.
                    </p>
                </div>
            ) : (
                <div class="space-y-4">
                    {ruleStates.map((rule, index) => (
                        <div
                            key={rule.id}
                            class="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                        >
                            {/* Rule Header */}
                            <div class="flex items-center justify-between mb-4">
                                <div class="flex items-center gap-3">
                                    <span class="text-sm font-medium text-gray-500">
                                        Rule {index + 1}
                                    </span>
                                    <input
                                        type="text"
                                        placeholder="Rule name (optional)"
                                        value={rule.name}
                                        onInput={(e) =>
                                            updateRule(rule.id, {
                                                name: (e.target as HTMLInputElement).value,
                                            })
                                        }
                                        class="px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                                    />
                                </div>
                                <div class="flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => moveRule(index, 'up')}
                                        disabled={index === 0}
                                        class="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                        title="Move up"
                                    >
                                        <svg
                                            class="w-4 h-4"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                                stroke-width="2"
                                                d="M5 15l7-7 7 7"
                                            />
                                        </svg>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => moveRule(index, 'down')}
                                        disabled={index === ruleStates.length - 1}
                                        class="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                        title="Move down"
                                    >
                                        <svg
                                            class="w-4 h-4"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                                stroke-width="2"
                                                d="M19 9l-7 7-7-7"
                                            />
                                        </svg>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => removeRule(rule.id)}
                                        class="p-1.5 text-gray-400 hover:text-red-500"
                                        title="Delete rule"
                                    >
                                        <svg
                                            class="w-4 h-4"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                                stroke-width="2"
                                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                            />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            {/* Conditions */}
                            <div class="mb-4">
                                <div class="flex items-center justify-between mb-2">
                                    <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Conditions (all must match)
                                    </label>
                                    <div class="flex items-center gap-2">
                                        {segments.length > 0 && (
                                            <select
                                                value=""
                                                onChange={(e) => {
                                                    const segmentKey = (e.target as HTMLSelectElement)
                                                        .value
                                                    if (segmentKey) {
                                                        addSegmentCondition(rule.id, segmentKey)
                                                        ;(e.target as HTMLSelectElement).value = ''
                                                    }
                                                }}
                                                class="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600"
                                            >
                                                <option value="">+ Add Segment</option>
                                                {segments.map((s) => (
                                                    <option key={s.key} value={s.key}>
                                                        {s.name}
                                                    </option>
                                                ))}
                                            </select>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => addCondition(rule.id)}
                                            class="inline-flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                        >
                                            <svg
                                                class="w-3 h-3"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path
                                                    stroke-linecap="round"
                                                    stroke-linejoin="round"
                                                    stroke-width="2"
                                                    d="M12 4v16m8-8H4"
                                                />
                                            </svg>
                                            Add Condition
                                        </button>
                                    </div>
                                </div>

                                <div class="space-y-2">
                                    {rule.conditions.map((condition, condIndex) => (
                                        <div
                                            key={condition.id}
                                            class="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-900 rounded-lg"
                                        >
                                            {condIndex > 0 && (
                                                <span class="text-xs font-medium text-gray-400 uppercase w-8">
                                                    AND
                                                </span>
                                            )}
                                            {condition.attribute === '$segment' ? (
                                                <>
                                                    <span class="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded text-sm font-medium">
                                                        Segment
                                                    </span>
                                                    <select
                                                        value={condition.operator}
                                                        onChange={(e) =>
                                                            updateCondition(rule.id, condition.id, {
                                                                operator: (e.target as HTMLSelectElement)
                                                                    .value as Operator,
                                                            })
                                                        }
                                                        class="px-2 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                                                    >
                                                        {segmentOperators.map((op) => (
                                                            <option key={op.value} value={op.value}>
                                                                {op.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <select
                                                        value={condition.value as string}
                                                        onChange={(e) =>
                                                            updateCondition(rule.id, condition.id, {
                                                                value: (e.target as HTMLSelectElement).value,
                                                            })
                                                        }
                                                        class="flex-1 px-2 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                                                    >
                                                        <option value="">Select segment...</option>
                                                        {segments.map((s) => (
                                                            <option key={s.key} value={s.key}>
                                                                {s.name} ({s.key})
                                                            </option>
                                                        ))}
                                                    </select>
                                                </>
                                            ) : (
                                                <>
                                                    <div class="relative flex-1">
                                                        <input
                                                            type="text"
                                                            placeholder="attribute"
                                                            list={`attributes-${rule.id}-${condition.id}`}
                                                            value={condition.attribute}
                                                            onInput={(e) =>
                                                                updateCondition(rule.id, condition.id, {
                                                                    attribute: (e.target as HTMLInputElement)
                                                                        .value,
                                                                })
                                                            }
                                                            class="w-full px-2 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                                                        />
                                                        <datalist
                                                            id={`attributes-${rule.id}-${condition.id}`}
                                                        >
                                                            {commonAttributes.map((attr) => (
                                                                <option key={attr} value={attr} />
                                                            ))}
                                                        </datalist>
                                                    </div>
                                                    <select
                                                        value={condition.operator}
                                                        onChange={(e) =>
                                                            updateCondition(rule.id, condition.id, {
                                                                operator: (e.target as HTMLSelectElement)
                                                                    .value as Operator,
                                                            })
                                                        }
                                                        class="px-2 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
                                                    >
                                                        {operators.map((op) => (
                                                            <option key={op.value} value={op.value}>
                                                                {op.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <input
                                                        type="text"
                                                        placeholder={
                                                            condition.operator === 'in' ||
                                                            condition.operator === 'not_in'
                                                                ? 'val1, val2, ...'
                                                                : condition.operator === 'matches'
                                                                  ? '^regex$'
                                                                  : 'value'
                                                        }
                                                        value={condition.value as string}
                                                        onInput={(e) =>
                                                            updateCondition(rule.id, condition.id, {
                                                                value: (e.target as HTMLInputElement).value,
                                                            })
                                                        }
                                                        class="flex-1 px-2 py-1.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                                                    />
                                                </>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => removeCondition(rule.id, condition.id)}
                                                class="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                            >
                                                <svg
                                                    class="w-4 h-4"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path
                                                        stroke-linecap="round"
                                                        stroke-linejoin="round"
                                                        stroke-width="2"
                                                        d="M6 18L18 6M6 6l12 12"
                                                    />
                                                </svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                {rule.conditions.length === 0 && (
                                    <p class="text-sm text-gray-400 italic py-2">
                                        No conditions - rule will match all users
                                    </p>
                                )}
                            </div>

                            {/* Percentage Rollout */}
                            <div class="mb-4">
                                <div class="flex items-center gap-3">
                                    <label class="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={rule.percentage !== null}
                                            onChange={(e) =>
                                                updateRule(rule.id, {
                                                    percentage: (e.target as HTMLInputElement).checked
                                                        ? 100
                                                        : null,
                                                })
                                            }
                                            class="rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span class="text-sm text-gray-700 dark:text-gray-300">
                                            Percentage rollout
                                        </span>
                                    </label>
                                    {rule.percentage !== null && (
                                        <div class="flex items-center gap-2">
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={rule.percentage}
                                                onInput={(e) =>
                                                    updateRule(rule.id, {
                                                        percentage: Math.min(
                                                            100,
                                                            Math.max(
                                                                0,
                                                                parseInt(
                                                                    (e.target as HTMLInputElement).value
                                                                ) || 0
                                                            )
                                                        ),
                                                    })
                                                }
                                                class="w-20 px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                                            />
                                            <span class="text-sm text-gray-500">% of users</span>
                                        </div>
                                    )}
                                </div>
                                {rule.percentage !== null && (
                                    <p class="text-xs text-gray-500 mt-1 ml-6">
                                        Users are consistently bucketed based on their userId
                                    </p>
                                )}
                            </div>

                            {/* Value */}
                            <div>
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Return Value
                                </label>
                                {renderValueInput(rule)}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
