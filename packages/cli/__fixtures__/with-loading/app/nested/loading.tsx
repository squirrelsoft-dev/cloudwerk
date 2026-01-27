/**
 * Test fixture: Nested loading boundary.
 */

import type { LoadingProps } from '@cloudwerk/core'

export default function NestedLoading({ pathname }: LoadingProps) {
  return (
    <div data-loading="nested">
      <p data-loading-message>Loading nested content...</p>
      <p data-loading-pathname>{pathname}</p>
    </div>
  )
}
