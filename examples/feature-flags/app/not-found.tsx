export default function NotFound() {
  return (
    <main class="min-h-screen flex flex-col items-center justify-center px-4">
      <div class="text-center max-w-md">
        {/* 404 Illustration */}
        <div class="mb-8">
          <div class="inline-flex items-center justify-center w-24 h-24 bg-indigo-100 dark:bg-indigo-900/30 rounded-full mb-6">
            <svg class="w-12 h-12 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
            </svg>
          </div>
          <div class="text-8xl font-bold text-gray-200 dark:text-gray-800">404</div>
        </div>

        {/* Message */}
        <h1 class="text-2xl font-bold mb-3">Flag not found</h1>
        <p class="text-gray-600 dark:text-gray-400 mb-8">
          The page you're looking for doesn't exist or has been moved. Maybe the feature flag for this page is still disabled?
        </p>

        {/* Actions */}
        <div class="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="/"
            class="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
          >
            Go home
          </a>
          <a
            href="/docs"
            class="px-6 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium"
          >
            View docs
          </a>
        </div>

        {/* Help link */}
        <p class="mt-8 text-sm text-gray-500 dark:text-gray-500">
          Need help?{' '}
          <a href="/contact" class="text-indigo-600 hover:text-indigo-700 underline underline-offset-2">
            Contact support
          </a>
        </p>
      </div>
    </main>
  )
}
