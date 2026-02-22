'use client'

import { useState } from 'hono/jsx'
import { secureFetch } from '@cloudwerk/security/client'
import type { Segment, Operator } from '@/lib/types'

interface SegmentFormProps {
    segment?: Segment
}

interface Condition {
    id: number
    attribute: string
    operator: string
    value: string
}

const operators: { value: Operator; label: string }[] = [
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
    { value: 'in', label: 'is in (comma-separated)' },
    { value: 'not_in', label: 'is not in (comma-separated)' },
    { value: 'matches', label: 'matches regex' },
    { value: 'semver_eq', label: 'semver equals' },
    { value: 'semver_gt', label: 'semver greater than' },
    { value: 'semver_gte', label: 'semver greater than or equal' },
    { value: 'semver_lt', label: 'semver less than' },
    { value: 'semver_lte', label: 'semver less than or equal' },
]

let conditionIdCounter = 0

function initializeConditions(segment?: Segment): Condition[] {
    if (!segment) return []
    return segment.conditions.map(c => ({
        id: ++conditionIdCounter,
        attribute: c.attribute,
        operator: c.operator,
        value: Array.isArray(c.value) ? c.value.join(', ') : String(c.value),
    }))
}

export default function SegmentForm({ segment }: SegmentFormProps) {
    const isEditMode = !!segment
    const [conditions, setConditions] = useState<Condition[]>(() => initializeConditions(segment))
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [name, setName] = useState(segment?.name ?? '')
    const [description, setDescription] = useState(segment?.description ?? '')

    const addCondition = () => {
        setConditions([
            ...conditions,
            { id: ++conditionIdCounter, attribute: '', operator: 'eq', value: '' },
        ])
    }

    const removeCondition = (id: number) => {
        setConditions(conditions.filter(c => c.id !== id))
    }

    const updateCondition = (id: number, field: keyof Condition, value: string) => {
        setConditions(conditions.map(c =>
            c.id === id ? { ...c, [field]: value } : c
        ))
    }

    const handleSubmit = async (e: Event) => {
        e.preventDefault()
        const form = e.target as HTMLFormElement
        const formData = new FormData(form)

        if (conditions.length === 0) {
            alert('Please add at least one condition')
            return
        }

        const parsedConditions = conditions.map(c => {
            let val: unknown = c.value

            if (c.operator === 'in' || c.operator === 'not_in') {
                val = c.value.split(',').map(v => v.trim()).filter(Boolean)
            } else if (val === 'true') {
                val = true
            } else if (val === 'false') {
                val = false
            } else if (!isNaN(Number(val)) && (val as string).trim() !== '') {
                val = Number(val)
            }

            return {
                attribute: c.attribute,
                operator: c.operator,
                value: val,
            }
        })

        const body = isEditMode
            ? {
                name,
                description: description || undefined,
                conditions: parsedConditions,
            }
            : {
                key: formData.get('key'),
                name,
                description: description || undefined,
                conditions: parsedConditions,
            }

        setIsSubmitting(true)

        try {
            const url = isEditMode
                ? `/api/admin/segments/${segment.id}`
                : '/api/admin/segments'
            const method = isEditMode ? 'PUT' : 'POST'

            const res = await secureFetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            })

            const data = await res.json()

            if (res.ok) {
                window.location.href = `/dashboard/segments/${data.segment.id}`
            } else {
                alert(data.error || `Failed to ${isEditMode ? 'update' : 'create'} segment`)
                setIsSubmitting(false)
            }
        } catch {
            alert(`Failed to ${isEditMode ? 'update' : 'create'} segment`)
            setIsSubmitting(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} class="space-y-6">
            {/* Basic Info */}
            <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h2 class="text-lg font-medium mb-4">Basic Information</h2>

                <div class="space-y-4">
                    <div>
                        <label for="key" class="block text-sm font-medium mb-1">
                            Key <span class="text-red-500">*</span>
                        </label>
                        {isEditMode ? (
                            <div class="flex items-center gap-2">
                                <code class="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm font-mono">
                                    {segment.key}
                                </code>
                                <span class="text-xs text-gray-500">(cannot be changed)</span>
                            </div>
                        ) : (
                            <>
                                <input
                                    type="text"
                                    id="key"
                                    name="key"
                                    required
                                    pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
                                    placeholder="beta-users"
                                    class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                                />
                                <p class="mt-1 text-xs text-gray-500">
                                    Lowercase letters, numbers, and dashes only. This cannot be changed later.
                                </p>
                            </>
                        )}
                    </div>

                    <div>
                        <label for="name" class="block text-sm font-medium mb-1">
                            Name <span class="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            required
                            value={name}
                            onInput={(e) => setName((e.target as HTMLInputElement).value)}
                            placeholder="Beta Users"
                            class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                        />
                    </div>

                    <div>
                        <label for="description" class="block text-sm font-medium mb-1">
                            Description
                        </label>
                        <textarea
                            id="description"
                            name="description"
                            rows={3}
                            value={description}
                            onInput={(e) => setDescription((e.target as HTMLTextAreaElement).value)}
                            placeholder="Describe who this segment targets..."
                            class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
                        />
                    </div>
                </div>
            </div>

            {/* Conditions */}
            <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <div class="flex items-center justify-between mb-4">
                    <div>
                        <h2 class="text-lg font-medium">Conditions</h2>
                        <p class="text-sm text-gray-500 mt-1">
                            All conditions must match (AND logic)
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={addCondition}
                        class="inline-flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                        </svg>
                        Add Condition
                    </button>
                </div>

                <div class="space-y-3">
                    {conditions.map((condition) => (
                        <div
                            key={condition.id}
                            class="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
                        >
                            <input
                                type="text"
                                placeholder="userId, email, country..."
                                value={condition.attribute}
                                onInput={(e) => updateCondition(condition.id, 'attribute', (e.target as HTMLInputElement).value)}
                                required
                                class="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                            />
                            <select
                                value={condition.operator}
                                onChange={(e) => updateCondition(condition.id, 'operator', (e.target as HTMLSelectElement).value)}
                                class="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                            >
                                {operators.map((op) => (
                                    <option key={op.value} value={op.value}>
                                        {op.label}
                                    </option>
                                ))}
                            </select>
                            <input
                                type="text"
                                placeholder="value"
                                value={condition.value}
                                onInput={(e) => updateCondition(condition.id, 'value', (e.target as HTMLInputElement).value)}
                                required
                                class="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                            />
                            <button
                                type="button"
                                onClick={() => removeCondition(condition.id)}
                                class="p-2 text-gray-400 hover:text-red-500 transition-colors"
                            >
                                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    ))}
                </div>

                {conditions.length === 0 && (
                    <div class="text-center py-8 text-gray-500">
                        <p class="text-sm">No conditions added yet. Click "Add Condition" to define targeting criteria.</p>
                    </div>
                )}
            </div>

            {/* Actions */}
            <div class="flex items-center justify-end gap-4">
                <a
                    href={isEditMode ? `/dashboard/segments/${segment.id}` : '/dashboard/segments'}
                    class="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                    Cancel
                </a>
                <button
                    type="submit"
                    disabled={isSubmitting}
                    class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50"
                >
                    {isSubmitting
                        ? (isEditMode ? 'Saving...' : 'Creating...')
                        : (isEditMode ? 'Save Changes' : 'Create Segment')}
                </button>
            </div>
        </form>
    )
}
