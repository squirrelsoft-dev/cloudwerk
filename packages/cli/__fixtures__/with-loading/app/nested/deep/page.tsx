/**
 * Test fixture: Deep nested page that uses nested loading.tsx (not root).
 */

import type { PageProps, LoaderArgs } from '@cloudwerk/core'

interface LoaderData {
  depth: string
}

export async function loader(_args: LoaderArgs): Promise<LoaderData> {
  await new Promise((resolve) => setTimeout(resolve, 25))
  return {
    depth: 'deeply nested',
  }
}

export default function DeepPage({ params: _params, depth }: PageProps & LoaderData) {
  return (
    <div data-page="deep">
      <h1>Deep Page</h1>
      <p data-depth>Depth: {depth}</p>
    </div>
  )
}
