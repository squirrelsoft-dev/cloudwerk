interface ErrorProps {
  error?: Error
  reset?: () => void
}

export default function ErrorPage({ error, reset }: ErrorProps) {
  return (
    <main class="min-h-screen flex flex-col items-center justify-center px-4">
      <div class="text-center max-w-md">
        {/* Error Illustration */}
        <div class="mb-8">
          <div class="inline-flex items-center justify-center w-24 h-24 bg-red-100 dark:bg-red-900/30 rounded-full mb-6">
            <svg class="w-12 h-12 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div class="text-8xl font-bold text-gray-200 dark:text-gray-800">500</div>
        </div>

        {/* Message */}
        <h1 class="text-2xl font-bold mb-3">Something went wrong</h1>
        <p class="text-gray-600 dark:text-gray-400 mb-4">
          An unexpected error occurred. Our team has been notified and is working on a fix.
        </p>

        {/* Error details (if available) */}
        {error?.message && (
          <div class="mb-6 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-left">
            <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Error details:</p>
            <code class="text-sm text-red-600 dark:text-red-400 break-all">
              {error.message}
            </code>
          </div>
        )}

        {/* Actions */}
        <div class="flex flex-col sm:flex-row gap-3 justify-center">
          {reset && (
            <button
              onClick={reset}
              class="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              Try again
            </button>
          )}
          <a
            href="/"
            class="px-6 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium"
          >
            Go home
          </a>
        </div>

        {/* Status page link */}
        <div class="mt-8 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <div class="flex items-center justify-center gap-2 text-amber-800 dark:text-amber-200">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span class="text-sm font-medium">
              Check our{' '}
              <a href="/status" class="underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-100">
                status page
              </a>
              {' '}for service updates
            </span>
          </div>
        </div>

        {/* Help link */}
        <p class="mt-6 text-sm text-gray-500 dark:text-gray-500">
          If this problem persists,{' '}
          <a href="/contact" class="text-indigo-600 hover:text-indigo-700 underline underline-offset-2">
            contact support
          </a>
        </p>
      </div>
    </main>
  )
}
