import type { ErrorBoundaryProps } from '@cloudwerk/core'

export default function AdminErrorBoundary({ error }: ErrorBoundaryProps) {
  return (
    <div data-testid="admin-error-boundary">
      <h1>Admin Error</h1>
      <p data-testid="admin-error-message">{error.message}</p>
    </div>
  )
}
