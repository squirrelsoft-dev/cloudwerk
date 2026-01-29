import type { PageProps, LoaderArgs } from '@cloudwerk/core'
import { NotFoundError } from '@cloudwerk/core'

export async function loader({ params: _params }: LoaderArgs) {
  // Simulate a not found scenario (e.g., resource doesn't exist in database)
  throw new NotFoundError('The requested resource was not found in the database')
}

export default function ThrowsNotFoundPage({ params: _params }: PageProps) {
  return (
    <div>
      <h1>This page should not be visible</h1>
      <p>If you see this, the not-found boundary is not working.</p>
    </div>
  )
}
