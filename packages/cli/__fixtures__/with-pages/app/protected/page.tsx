/**
 * Test fixture: Page with route config.
 */

import type { RouteConfig } from '@cloudwerk/core'

export const config: RouteConfig = {
  auth: 'required',
  cache: 'private',
}

export default function ProtectedPage() {
  return (
    <div>
      <h1>Protected Page</h1>
      <p>This page requires authentication</p>
    </div>
  )
}
