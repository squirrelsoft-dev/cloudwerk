/**
 * Test fixture: Page with slow loader to test streaming.
 */

import type { PageProps, LoaderArgs } from '@cloudwerk/core'

interface LoaderData {
  message: string
  loadedAt: string
}

// Simulates a slow database call or API fetch
export async function loader(_args: LoaderArgs): Promise<LoaderData> {
  // Small delay to simulate async work
  await new Promise((resolve) => setTimeout(resolve, 50))
  return {
    message: 'Data loaded successfully',
    loadedAt: new Date().toISOString(),
  }
}

export default function SlowLoaderPage({
  params: _params,
  message,
  loadedAt,
}: PageProps & LoaderData) {
  return (
    <div data-page="slow-loader">
      <h1>Slow Loader Page</h1>
      <p data-message>{message}</p>
      <p data-loaded-at>{loadedAt}</p>
    </div>
  )
}
