/**
 * Page with nested Suspense boundaries.
 *
 * This demonstrates multiple independent Suspense boundaries resolving independently.
 */

import { Suspense } from 'hono/jsx/streaming'
import type { PageProps } from '@cloudwerk/core'

// Async components with different delays
async function FastContent() {
  await new Promise((resolve) => setTimeout(resolve, 5))
  return <div data-content="fast">Fast content (5ms)</div>
}

async function SlowContent() {
  await new Promise((resolve) => setTimeout(resolve, 20))
  return <div data-content="slow">Slow content (20ms)</div>
}

async function NestedContent() {
  await new Promise((resolve) => setTimeout(resolve, 10))
  return (
    <div data-content="nested-outer">
      <p>Outer content</p>
      <Suspense fallback={<span data-fallback="nested-inner">Loading inner...</span>}>
        <FastContent />
      </Suspense>
    </div>
  )
}

export default function NestedPage(_props: PageProps) {
  return (
    <main data-page="nested">
      <h1>Nested Suspense Page</h1>

      {/* Multiple independent Suspense boundaries */}
      <section>
        <Suspense fallback={<div data-fallback="fast">Loading fast...</div>}>
          <FastContent />
        </Suspense>
      </section>

      <section>
        <Suspense fallback={<div data-fallback="slow">Loading slow...</div>}>
          <SlowContent />
        </Suspense>
      </section>

      {/* Nested Suspense boundaries */}
      <section>
        <Suspense fallback={<div data-fallback="nested">Loading nested...</div>}>
          <NestedContent />
        </Suspense>
      </section>
    </main>
  )
}
