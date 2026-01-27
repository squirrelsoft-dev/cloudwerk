/**
 * Test fixture: Dashboard-specific error boundary component.
 */

import type { ErrorBoundaryProps } from '@cloudwerk/core'

export default function DashboardErrorBoundary({
  error,
  errorType,
}: ErrorBoundaryProps) {
  return (
    <div data-error-boundary="dashboard">
      <h1>Dashboard Error</h1>
      <p data-error-message>{error.message}</p>
      {error.digest && <p data-error-digest>Error ID: {error.digest}</p>}
      <p data-error-type>Error source: {errorType}</p>
    </div>
  )
}
