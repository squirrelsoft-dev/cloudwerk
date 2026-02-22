'use client'

import { useState } from 'hono/jsx'
import { authenticateWithPasskey } from '@cloudwerk/auth/client'

export default function PasskeyLoginForm() {
    const [email, setEmail] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: Event) => {
        e.preventDefault()
        setError(null)
        setLoading(true)

        try {
            const result = await authenticateWithPasskey({
                email: email.trim(),
                callbackUrl: '/dashboard',
                redirect: true,
            })

            if (!result.ok) {
                throw new Error(result.error || 'Authentication failed')
            }
        } catch (err) {
            setLoading(false)
            if (err instanceof Error) {
                if (err.name === 'NotAllowedError') {
                    setError('Authentication was cancelled or not allowed')
                } else {
                    setError(err.message)
                }
            } else {
                setError('An error occurred')
            }
        }
    }

    return (
        <form onSubmit={handleSubmit} class="space-y-4">
            {error && (
                <div class="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                    {error}
                </div>
            )}

            <div>
                <label for="email" class="block text-sm font-medium mb-2">
                    Email address
                </label>
                <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    value={email}
                    onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
                    placeholder="you@example.com"
                    class="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-shadow"
                />
            </div>

            <button
                type="submit"
                disabled={loading}
                class="w-full flex items-center justify-center gap-3 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                </svg>
                {loading ? 'Authenticating...' : 'Sign in with Passkey'}
            </button>
        </form>
    )
}
