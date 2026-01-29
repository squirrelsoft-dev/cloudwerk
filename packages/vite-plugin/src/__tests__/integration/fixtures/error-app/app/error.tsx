import type { ErrorBoundaryProps } from '@cloudwerk/core'

export default function ErrorBoundary({ error }: ErrorBoundaryProps) {
  return (
    <div data-testid="root-error-boundary">
      <h1>Something went wrong</h1>
      <p data-testid="error-message">{error.message}</p>
      {error.digest && <p data-testid="error-digest">Digest: {error.digest}</p>}
    </div>
  )
}
