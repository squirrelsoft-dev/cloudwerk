/**
 * Page with single Suspense boundary.
 *
 * This demonstrates native Suspense streaming support.
 */

import { Suspense } from 'hono/jsx/streaming'
import type { PageProps } from '@cloudwerk/core'

// Async component that simulates data loading
async function AsyncContent() {
  // Simulate async operation
  await new Promise((resolve) => setTimeout(resolve, 10))
  return <div data-content="async">Async content loaded</div>
}

export default function HomePage(_props: PageProps) {
  return (
    <main data-page="home">
      <h1>Home Page with Suspense</h1>
      <Suspense fallback={<div data-fallback="loading">Loading content...</div>}>
        <AsyncContent />
      </Suspense>
    </main>
  )
}
