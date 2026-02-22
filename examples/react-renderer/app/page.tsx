import Counter from './components/counter'

export default function HomePage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-8">
      {/* Logo/Brand */}
      <div className="mb-8">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-orange-500 to-yellow-500 bg-clip-text text-transparent">
          Cloudwerk
        </h1>
      </div>

      {/* Tagline */}
      <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 text-center max-w-md">
        Full-stack framework for Cloudflare Workers
      </p>

      {/* Counter Demo */}
      <div className="mb-12">
        <Counter />
      </div>

      {/* Quick Links */}
      <div className="flex gap-4 text-sm">
        <a
          href="https://cloudwerk.dev/docs"
          className="text-orange-500 hover:text-orange-600 underline underline-offset-4"
        >
          Documentation
        </a>
        <span className="text-gray-300 dark:text-gray-700">|</span>
        <a
          href="https://github.com/cloudwerk/cloudwerk"
          className="text-orange-500 hover:text-orange-600 underline underline-offset-4"
        >
          GitHub
        </a>
      </div>

      {/* Edit hint */}
      <p className="mt-16 text-sm text-gray-400 dark:text-gray-600">
        Edit <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">app/page.tsx</code> to get started
      </p>
    </main>
  )
}
