'use client'

import { useState } from 'hono/jsx'

interface ShortenResult {
  code: string
  shortUrl: string
  url: string
}

export default function ShortenForm() {
  const [url, setUrl] = useState('')
  const [result, setResult] = useState<ShortenResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  async function handleSubmit(e: Event) {
    e.preventDefault()
    setError(null)
    setResult(null)
    setLoading(true)

    try {
      const response = await fetch('/api/shorten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to shorten URL')
        return
      }

      setResult(data)
      setUrl('')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function copyToClipboard() {
    if (!result) return
    try {
      await navigator.clipboard.writeText(result.shortUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for browsers without clipboard API
      const textArea = document.createElement('textarea')
      textArea.value = result.shortUrl
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div class="space-y-6">
      {/* Form */}
      <form onSubmit={handleSubmit} class="flex gap-3">
        <input
          type="url"
          value={url}
          onInput={(e) => setUrl((e.target as HTMLInputElement).value)}
          placeholder="https://example.com/long-url"
          required
          class="flex-1 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
        />
        <button
          type="submit"
          disabled={loading}
          class="px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-medium rounded-lg transition-colors"
        >
          {loading ? 'Shortening...' : 'Shorten'}
        </button>
      </form>

      {/* Error */}
      {error && (
        <div class="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div class="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">Your shortened link:</p>
          <div class="flex items-center gap-3">
            <a
              href={result.shortUrl}
              target="_blank"
              rel="noopener noreferrer"
              class="text-lg font-medium text-blue-600 dark:text-blue-400 hover:underline break-all"
            >
              {result.shortUrl}
            </a>
            <button
              onClick={copyToClipboard}
              class="shrink-0 px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded transition-colors"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <div class="flex items-center justify-between mt-3 pt-3 border-t border-green-200 dark:border-green-800">
            <p class="text-xs text-gray-500 dark:text-gray-500 truncate flex-1 mr-4">
              Original: {result.url}
            </p>
            <a
              href={`/stats/${result.code}`}
              class="text-xs text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
            >
              View Stats
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
