/**
 * Test fixture: Root error boundary component.
 */

import type { ErrorBoundaryProps } from '@cloudwerk/core'

export default function RootErrorBoundary({
  error,
  errorType,
  params: _params,
}: ErrorBoundaryProps) {
  return (
    <div data-error-boundary="root">
      <h1>Something went wrong!</h1>
      <p data-error-message>{error.message}</p>
      {error.digest && <p data-error-digest>Error ID: {error.digest}</p>}
      <p data-error-type>Error source: {errorType}</p>
    </div>
  )
}
