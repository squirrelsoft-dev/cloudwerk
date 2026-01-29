import type { PageProps, LoaderArgs } from '@cloudwerk/core'

export async function loader({ params }: LoaderArgs) {
  // Simulate an error in the loader
  throw new Error('This is a simulated error from the loader!')
}

export default function ThrowsErrorPage({ params }: PageProps) {
  return (
    <div>
      <h1>This page should not be visible</h1>
      <p>If you see this, the error boundary is not working.</p>
    </div>
  )
}
