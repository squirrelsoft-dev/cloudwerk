import type { ErrorBoundaryProps } from '@cloudwerk/core'

export default function RootError({ error, errorType }: ErrorBoundaryProps) {
  return (
    <div class="error">
      <h1>Root Error Boundary</h1>
      <p><strong>Error Type:</strong> {errorType}</p>
      <p><strong>Message:</strong> {error.message}</p>
      {error.digest && <p><strong>Digest:</strong> {error.digest}</p>}
      <p>This is the root error.tsx boundary catching an error.</p>
    </div>
  )
}
