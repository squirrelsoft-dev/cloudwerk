import type { PageProps, LoaderArgs } from '@cloudwerk/core'

export async function loader({ params }: LoaderArgs) {
  // Simulate an error in the dashboard
  throw new Error('Dashboard-specific error!')
}

export default function DashboardThrowsErrorPage({ params }: PageProps) {
  return (
    <div>
      <h1>This page should not be visible</h1>
      <p>If you see this, the dashboard error boundary is not working.</p>
    </div>
  )
}
