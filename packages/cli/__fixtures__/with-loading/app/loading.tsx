/**
 * Test fixture: Root loading boundary component.
 */

import type { LoadingProps } from '@cloudwerk/core'

export default function RootLoading({ params, pathname }: LoadingProps) {
  return (
    <div data-loading="root" data-pathname={pathname}>
      <p data-loading-message>Loading...</p>
      <p data-loading-params>{JSON.stringify(params)}</p>
    </div>
  )
}
