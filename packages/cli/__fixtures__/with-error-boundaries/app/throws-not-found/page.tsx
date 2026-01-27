/**
 * Test fixture: Page that throws NotFoundError in loader.
 */

import { notFound } from '@cloudwerk/core'

export async function loader() {
  notFound('Resource not found')
}

export default function ThrowsNotFoundPage() {
  return (
    <div data-page="throws-not-found">
      <h1>This should not render</h1>
    </div>
  )
}
