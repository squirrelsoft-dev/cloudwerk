'use client'

import { useState } from 'hono/jsx'
import { secureFetch } from '@cloudwerk/security/client'

interface FlagToggleProps {
    flagId: string
    enabled: boolean
}

export default function FlagToggle({ flagId, enabled }: FlagToggleProps) {
    const [isToggling, setIsToggling] = useState(false)
    const [currentEnabled, setCurrentEnabled] = useState(enabled)

    const handleToggle = async (e: Event) => {
        e.preventDefault()
        e.stopPropagation()

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

    return (
        <button
            type="button"
            onClick={handleToggle}
            disabled={isToggling}
            class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
            style={{
                backgroundColor: currentEnabled ? '#4f46e5' : '#d1d5db',
            }}
            title={currentEnabled ? 'Click to disable' : 'Click to enable'}
        >
            <span class="sr-only">{currentEnabled ? 'Disable' : 'Enable'} flag</span>
            <span
                class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                style={{
                    transform: currentEnabled ? 'translateX(1.25rem)' : 'translateX(0)',
                }}
            />
        </button>
    )
}
