import type { PageProps } from '@cloudwerk/core'

export default function DashboardPage({ params }: PageProps) {
  return (
    <div>
      <h1>Dashboard</h1>
      <p>This is the dashboard page. It works normally.</p>
      <ul>
        <li><a href="/dashboard/throws-error">Trigger dashboard error</a> - Should show dashboard/error.tsx (not root)</li>
      </ul>
    </div>
  )
}
