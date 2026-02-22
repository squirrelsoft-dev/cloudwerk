'use client'

import { useState } from 'hono/jsx'
import { secureFetch } from '@cloudwerk/security/client'
import type { Flag, FlagType, TargetingRule, Segment } from '@/lib/types'
import TargetingRulesBuilder from './TargetingRulesBuilder'

interface FlagFormProps {
    flag?: Flag
    segments?: Segment[]
}

function getInitialDefaultValue(flag: Flag | undefined, flagType: FlagType): string {
    if (!flag) {
        if (flagType === 'boolean') return 'false'
        if (flagType === 'number') return '0'
        if (flagType === 'json') return '{}'
        return ''
    }
    if (flag.type === 'json') {
        return JSON.stringify(flag.defaultValue, null, 2)
    }
    return String(flag.defaultValue)
}

export default function FlagForm({ flag, segments = [] }: FlagFormProps) {
    const isEditMode = !!flag
    const [flagType, setFlagType] = useState<FlagType>(flag?.type ?? 'boolean')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [rules, setRules] = useState<TargetingRule[]>(flag?.rules ?? [])
    const [enabled, setEnabled] = useState(flag?.enabled ?? false)
    const [name, setName] = useState(flag?.name ?? '')
    const [description, setDescription] = useState(flag?.description ?? '')
    const [tags, setTags] = useState(flag?.tags?.join(', ') ?? '')
    const [defaultValue, setDefaultValue] = useState(() => getInitialDefaultValue(flag, flag?.type ?? 'boolean'))

    const handleSubmit = async (e: Event) => {
        e.preventDefault()
        const form = e.target as HTMLFormElement
        const formData = new FormData(form)

        const tagsArray = tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : []

        let parsedDefaultValue: unknown = defaultValue
        if (flagType === 'boolean') {
            parsedDefaultValue = defaultValue === 'true'
        } else if (flagType === 'number') {
            parsedDefaultValue = parseFloat(defaultValue) || 0
        } else if (flagType === 'json') {
            try {
                parsedDefaultValue = JSON.parse(defaultValue)
            } catch {
                parsedDefaultValue = {}
            }
        }

        const body = isEditMode
            ? {
                name,
                description: description || undefined,
                enabled,
                defaultValue: parsedDefaultValue,
                tags: tagsArray,
                rules,
            }
            : {
                key: formData.get('key'),
                name,
                description: description || undefined,
                type: flagType,
                enabled,
                defaultValue: parsedDefaultValue,
                tags: tagsArray,
                rules,
            }

        setIsSubmitting(true)

        try {
            const url = isEditMode
                ? `/api/admin/flags/${flag.id}`
                : '/api/admin/flags'
            const method = isEditMode ? 'PUT' : 'POST'

            const res = await secureFetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            })

            const data = await res.json()

            if (res.ok) {
                window.location.href = `/dashboard/flags/${data.flag.id}`
            } else {
                alert(data.error || `Failed to ${isEditMode ? 'update' : 'create'} flag`)
                setIsSubmitting(false)
            }
        } catch {
            alert(`Failed to ${isEditMode ? 'update' : 'create'} flag`)
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
                                    {flag.key}
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
                                    placeholder="my-feature-flag"
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
                            placeholder="My Feature Flag"
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
                            placeholder="Describe what this flag controls..."
                            class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
                        />
                    </div>
                </div>
            </div>

            {/* Type & Default Value */}
            <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h2 class="text-lg font-medium mb-4">Type & Default Value</h2>

                <div class="space-y-4">
                    <div>
                        <label for="type" class="block text-sm font-medium mb-1">
                            Flag Type
                        </label>
                        {isEditMode ? (
                            <div class="flex items-center gap-2">
                                <span class="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm">
                                    {flag.type === 'boolean' && 'Boolean (true/false)'}
                                    {flag.type === 'string' && 'String'}
                                    {flag.type === 'number' && 'Number'}
                                    {flag.type === 'json' && 'JSON'}
                                </span>
                                <input type="hidden" name="type" value={flag.type} />
                                <span class="text-xs text-gray-500">(cannot be changed)</span>
                            </div>
                        ) : (
                            <select
                                id="type"
                                name="type"
                                value={flagType}
                                onChange={(e) => setFlagType((e.target as HTMLSelectElement).value as FlagType)}
                                class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                            >
                                <option value="boolean">Boolean (true/false)</option>
                                <option value="string">String</option>
                                <option value="number">Number</option>
                                <option value="json">JSON</option>
                            </select>
                        )}
                    </div>

                    <div>
                        <label for="defaultValue" class="block text-sm font-medium mb-1">
                            {flagType === 'json' ? 'Default Value (JSON)' : 'Default Value'}
                        </label>
                        {flagType === 'boolean' ? (
                            <select
                                id="defaultValue"
                                name="defaultValue"
                                value={defaultValue}
                                onChange={(e) => setDefaultValue((e.target as HTMLSelectElement).value)}
                                class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                            >
                                <option value="false">false</option>
                                <option value="true">true</option>
                            </select>
                        ) : flagType === 'number' ? (
                            <input
                                type="number"
                                id="defaultValue"
                                name="defaultValue"
                                value={defaultValue}
                                onInput={(e) => setDefaultValue((e.target as HTMLInputElement).value)}
                                class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                            />
                        ) : flagType === 'json' ? (
                            <textarea
                                id="defaultValue"
                                name="defaultValue"
                                rows={3}
                                value={defaultValue}
                                onInput={(e) => setDefaultValue((e.target as HTMLTextAreaElement).value)}
                                class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none font-mono text-sm resize-none"
                            />
                        ) : (
                            <input
                                type="text"
                                id="defaultValue"
                                name="defaultValue"
                                value={defaultValue}
                                onInput={(e) => setDefaultValue((e.target as HTMLInputElement).value)}
                                class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                            />
                        )}
                        <p class="mt-1 text-xs text-gray-500">
                            This value is returned when the flag is disabled or no targeting rules match.
                        </p>
                    </div>
                </div>
            </div>

            {/* Targeting Rules */}
            <TargetingRulesBuilder
                rules={rules}
                onChange={setRules}
                flagType={flagType}
                segments={segments}
            />

            {/* Tags */}
            <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h2 class="text-lg font-medium mb-4">Tags</h2>

                <div>
                    <label for="tags" class="block text-sm font-medium mb-1">
                        Tags (comma-separated)
                    </label>
                    <input
                        type="text"
                        id="tags"
                        name="tags"
                        value={tags}
                        onInput={(e) => setTags((e.target as HTMLInputElement).value)}
                        placeholder="frontend, experiment, checkout"
                        class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    />
                    <p class="mt-1 text-xs text-gray-500">
                        Tags help organize and filter flags.
                    </p>
                </div>
            </div>

            {/* Enable/Disable State */}
            <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <div class="flex items-center justify-between">
                    <div>
                        <h2 class="text-lg font-medium">Enable Flag</h2>
                        <p class="text-sm text-gray-500 mt-1">
                            When enabled, the flag will be evaluated. When disabled, the default value is always returned.
                        </p>
                    </div>
                    <label class="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={enabled}
                            onChange={(e) => setEnabled((e.target as HTMLInputElement).checked)}
                            class="sr-only peer"
                        />
                        <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                    </label>
                </div>
            </div>

            {/* Actions */}
            <div class="flex items-center justify-end gap-4">
                <a
                    href={isEditMode ? `/dashboard/flags/${flag.id}` : '/dashboard'}
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
                        : (isEditMode ? 'Save Changes' : 'Create Flag')}
                </button>
            </div>
        </form>
    )
}
