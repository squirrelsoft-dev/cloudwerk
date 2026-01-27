/**
 * Page with Suspense + loader.
 *
 * This demonstrates Suspense boundaries working alongside route loaders.
 */

import { Suspense } from 'hono/jsx/streaming'
import type { PageProps, LoaderArgs } from '@cloudwerk/core'

// Type for loader data
interface LoaderData {
  title: string
  timestamp: number
}

// Loader function - this runs before render
export async function loader(_args: LoaderArgs): Promise<LoaderData> {
  // Simulate database call
  await new Promise((resolve) => setTimeout(resolve, 5))
  return {
    title: 'Dynamic Title from Loader',
    timestamp: Date.now(),
  }
}

// Async component within Suspense
async function DynamicStats() {
  await new Promise((resolve) => setTimeout(resolve, 15))
  return (
    <div data-content="stats">
      <p>Users: 1000</p>
      <p>Revenue: $50000</p>
    </div>
  )
}

export default function WithLoaderPage(props: PageProps & LoaderData) {
  const { title, timestamp } = props

  return (
    <main data-page="with-loader">
      <h1 data-title>{title}</h1>
      <p data-timestamp>Loaded at: {timestamp}</p>

      <Suspense fallback={<div data-fallback="stats">Loading stats...</div>}>
        <DynamicStats />
      </Suspense>
    </main>
  )
}
