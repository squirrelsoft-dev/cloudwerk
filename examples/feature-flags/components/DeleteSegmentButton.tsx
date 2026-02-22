'use client'

import { useState } from 'hono/jsx'
import { secureFetch } from '@cloudwerk/security/client'

interface DeleteSegmentButtonProps {
    segmentId: string
}

export default function DeleteSegmentButton({ segmentId }: DeleteSegmentButtonProps) {
    const [isDeleting, setIsDeleting] = useState(false)

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this segment? This action cannot be undone.')) {
            return
        }

        setIsDeleting(true)

        try {
            const res = await secureFetch(`/api/admin/segments/${segmentId}`, {
                method: 'DELETE',
            })

            if (res.ok) {
                window.location.href = '/dashboard/segments'
            } else {
                const data = await res.json()
                alert(data.error || 'Failed to delete segment')
                setIsDeleting(false)
            }
        } catch {
            alert('Failed to delete segment')
            setIsDeleting(false)
        }
    }

    return (
        <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
        >
            {isDeleting ? 'Deleting...' : 'Delete'}
        </button>
    )
}
