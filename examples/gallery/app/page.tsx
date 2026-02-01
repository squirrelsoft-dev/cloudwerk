export default function HomePage() {
  return (
    <main class="flex flex-col items-center justify-center min-h-screen p-8">
      {/* Logo/Brand */}
      <div class="mb-8">
        <h1 class="text-5xl font-bold bg-gradient-to-r from-orange-500 to-yellow-500 bg-clip-text text-transparent">
          Gallery
        </h1>
      </div>

      {/* Tagline */}
      <p class="text-xl text-gray-600 dark:text-gray-400 mb-8 text-center max-w-md">
        Cloudflare Images Demo
      </p>

      {/* Demo Links */}
      <div class="flex flex-col gap-6 w-full max-w-md">
        <a
          href="/hosted"
          class="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700"
        >
          <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Hosted Images
          </h2>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Upload images to Cloudflare Images with variants. View thumbnails in a grid and full images in a dialog.
          </p>
        </a>

        <a
          href="/r2"
          class="block p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-700"
        >
          <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            R2 + IMAGES Binding
          </h2>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Upload images to R2 and serve with on-the-fly transformations using the IMAGES binding.
          </p>
        </a>
      </div>

      {/* Quick Links */}
      <div class="flex gap-4 text-sm mt-12">
        <a
          href="https://cloudwerk.dev/docs"
          class="text-orange-500 hover:text-orange-600 underline underline-offset-4"
        >
          Documentation
        </a>
        <span class="text-gray-300 dark:text-gray-700">|</span>
        <a
          href="https://github.com/cloudwerk/cloudwerk"
          class="text-orange-500 hover:text-orange-600 underline underline-offset-4"
        >
          GitHub
        </a>
      </div>
    </main>
  )
}
