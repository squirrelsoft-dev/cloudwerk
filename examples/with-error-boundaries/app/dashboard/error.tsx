import type { ErrorBoundaryProps } from '@cloudwerk/core'

export default function DashboardError({ error, errorType }: ErrorBoundaryProps) {
  return (
    <div class="dashboard-error">
      <h1>Dashboard Error Boundary</h1>
      <p>This is the <strong>dashboard-specific</strong> error.tsx boundary.</p>
      <p><strong>Error Type:</strong> {errorType}</p>
      <p><strong>Message:</strong> {error.message}</p>
      {error.digest && <p><strong>Digest:</strong> {error.digest}</p>}
      <p>Notice this has a yellow background, different from the root error boundary.</p>
      <p><a href="/dashboard">Back to Dashboard</a></p>
    </div>
  )
}
