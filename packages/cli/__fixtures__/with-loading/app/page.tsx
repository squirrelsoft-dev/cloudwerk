/**
 * Test fixture: Home page without loader.
 */

import type { PageProps } from '@cloudwerk/core'

export default function HomePage({ params: _params }: PageProps) {
  return (
    <div data-page="home">
      <h1>Home Page</h1>
      <p>Welcome to the loading test app.</p>
    </div>
  )
}
