export default function AboutPage() {
  return (
    <div class="min-h-screen bg-gray-100 py-12 px-4">
      <div class="max-w-2xl mx-auto">
        <nav class="mb-8 flex gap-4">
          <a href="/" class="text-blue-600 hover:underline">Home</a>
          <a href="/about" class="text-blue-600 hover:underline font-semibold">About</a>
        </nav>

        <article class="bg-white rounded-lg shadow-md p-8">
          <h1 class="text-3xl font-bold text-gray-900 mb-6">About</h1>

          <div class="prose prose-gray max-w-none">
            <p class="mb-4 leading-relaxed">
              Welcome to my blog! This is a demo application built with{' '}
              <strong>Cloudwerk</strong>, a full-stack framework for Cloudflare Workers.
            </p>

            <h2 class="text-2xl font-semibold mt-6 mb-3">Features</h2>
            <ul class="list-disc list-inside mb-4 space-y-1">
              <li>File-based routing with dynamic segments</li>
              <li>Server-side rendering with Hono JSX</li>
              <li>D1 database integration</li>
              <li>Static site generation for blog posts</li>
              <li>Tailwind CSS styling</li>
            </ul>

            <h2 class="text-2xl font-semibold mt-6 mb-3">Technology Stack</h2>
            <ul class="list-disc list-inside mb-4 space-y-1">
              <li>Cloudwerk framework</li>
              <li>Cloudflare Workers</li>
              <li>Cloudflare D1 (SQLite)</li>
              <li>Hono JSX</li>
              <li>Tailwind CSS v4</li>
            </ul>

            <p class="mt-6 leading-relaxed">
              Check out the{' '}
              <a href="https://cloudwerk.dev" class="text-blue-600 hover:underline">
                Cloudwerk documentation
              </a>{' '}
              to learn more about building full-stack applications on Cloudflare.
            </p>
          </div>
        </article>
      </div>
    </div>
  )
}
