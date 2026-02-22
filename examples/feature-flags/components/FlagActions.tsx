'use client'

import { useState } from 'hono/jsx'
import { secureFetch } from '@cloudwerk/security/client'

interface FlagActionsProps {
    flagId: string
    enabled: boolean
}

export default function FlagActions({ flagId, enabled }: FlagActionsProps) {
    const [isToggling, setIsToggling] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [currentEnabled, setCurrentEnabled] = useState(enabled)

    const handleToggle = async () => {
        setIsToggling(true)
        const newEnabled = !currentEnabled

        try {
            const res = await secureFetch(`/api/admin/flags/${flagId}/toggle`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled: newEnabled }),
            })

            if (res.ok) {
                setCurrentEnabled(newEnabled)
            } else {
                const data = await res.json()
                alert(data.error || 'Failed to toggle flag')
            }
        } catch {
            alert('Failed to toggle flag')
        } finally {
            setIsToggling(false)
        }
    }

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this flag? This action cannot be undone.')) {
            return
        }

        setIsDeleting(true)

        try {
            const res = await secureFetch(`/api/admin/flags/${flagId}`, {
                method: 'DELETE',
            })

            if (res.ok) {
                window.location.href = '/dashboard'
            } else {
                const data = await res.json()
                alert(data.error || 'Failed to delete flag')
                setIsDeleting(false)
            }
        } catch {
            alert('Failed to delete flag')
            setIsDeleting(false)
        }
    }

    return (
        <div class="flex items-center gap-3">
            <a
                href={`/dashboard/flags/${flagId}/edit`}
                class="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
            >
                Edit
            </a>
            <button
                type="button"
                onClick={handleToggle}
                disabled={isToggling}
                class={`px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                    currentEnabled
                        ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                        : 'bg-green-600 text-white hover:bg-green-700'
                }`}
            >
                {isToggling
                    ? (currentEnabled ? 'Disabling...' : 'Enabling...')
                    : (currentEnabled ? 'Disable' : 'Enable')}
            </button>
            <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
            >
                {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
        </div>
    )
}
