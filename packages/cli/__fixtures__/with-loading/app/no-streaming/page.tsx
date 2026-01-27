/**
 * Test fixture: Page with streaming disabled via config.
 */

import type { PageProps, LoaderArgs, RouteConfig } from '@cloudwerk/core'

// Disable streaming for this route
export const config: RouteConfig = {
  streaming: false,
}

interface LoaderData {
  message: string
}

export async function loader(_args: LoaderArgs): Promise<LoaderData> {
  await new Promise((resolve) => setTimeout(resolve, 20))
  return {
    message: 'Loaded without streaming',
  }
}

export default function NoStreamingPage({ params: _params, message }: PageProps & LoaderData) {
  return (
    <div data-page="no-streaming">
      <h1>No Streaming Page</h1>
      <p data-message>{message}</p>
    </div>
  )
}
