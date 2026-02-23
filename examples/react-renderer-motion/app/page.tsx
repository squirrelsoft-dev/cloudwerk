import FadeIn from './components/fade-in'
import Counter from './components/counter'

export default function HomePage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-8">
      <FadeIn>
        <h1 className="text-5xl font-bold bg-gradient-to-r from-orange-500 to-yellow-500 bg-clip-text text-transparent mb-4">
          Cloudwerk + Motion
        </h1>
      </FadeIn>

      <FadeIn>
        <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 text-center max-w-md">
          Client components with motion animations and hydration
        </p>
      </FadeIn>

      <FadeIn>
        <div className="mb-12">
          <Counter />
        </div>
      </FadeIn>

      <FadeIn>
        <p className="mt-8 text-sm text-gray-400 dark:text-gray-600">
          Edit <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">app/page.tsx</code> to get started
        </p>
      </FadeIn>
    </main>
  )
}
