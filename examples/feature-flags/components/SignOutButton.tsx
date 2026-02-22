'use client'

import { useState } from 'hono/jsx'
import { signOut } from '@cloudwerk/auth/client'

export default function SignOutButton() {
    const [loading, setLoading] = useState(false)

    const handleSignOut = async () => {
        setLoading(true)
        await signOut({ callbackUrl: '/' })
    }

    return (
        <button
            type="button"
            onClick={handleSignOut}
            disabled={loading}
            class="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-50"
        >
            {loading ? 'Signing out...' : 'Sign out'}
        </button>
    )
}
