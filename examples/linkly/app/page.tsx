import ShortenForm from './components/shorten-form'

export default function HomePage() {
  return (
    <main class="flex flex-col items-center justify-center min-h-screen p-8">
      {/* Logo/Brand */}
      <div class="mb-8">
        <h1 class="text-5xl font-bold bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">
          Linkly
        </h1>
      </div>

      {/* Tagline */}
      <p class="text-xl text-gray-600 dark:text-gray-400 mb-8 text-center max-w-md">
        Shorten your links, track your clicks
      </p>

      {/* Shorten Form */}
      <div class="w-full max-w-lg">
        <ShortenForm />
      </div>

      {/* Info */}
      <div class="mt-12 text-sm text-gray-500 dark:text-gray-500 text-center max-w-md">
        <p>Built with Cloudwerk using D1 for storage and KV for caching.</p>
        <p class="mt-2">Rate limited to 10 requests per minute.</p>
      </div>
    </main>
  )
}
