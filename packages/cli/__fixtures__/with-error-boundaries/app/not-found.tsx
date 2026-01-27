/**
 * Test fixture: Root not-found boundary component.
 */

import type { NotFoundProps } from '@cloudwerk/core'

export default function RootNotFound({ params: _params }: NotFoundProps) {
  return (
    <div data-not-found="root">
      <h1>404 - Page Not Found</h1>
      <p>The requested resource could not be found.</p>
    </div>
  )
}
