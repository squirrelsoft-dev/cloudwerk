/**
 * Test fixture: Loading boundary that should NOT be used (streaming disabled).
 */

import type { LoadingProps } from '@cloudwerk/core'

export default function NoStreamingLoading({ pathname: _pathname }: LoadingProps) {
  return (
    <div data-loading="no-streaming">
      <p>This loading should not appear when streaming is disabled</p>
    </div>
  )
}
