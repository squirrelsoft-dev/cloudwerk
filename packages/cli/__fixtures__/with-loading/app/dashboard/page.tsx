/**
 * Test fixture: Dashboard page with loader.
 */

import type { PageProps, LoaderArgs } from '@cloudwerk/core'

interface LoaderData {
  stats: {
    users: number
    revenue: number
  }
}

export async function loader(_args: LoaderArgs): Promise<LoaderData> {
  // Small delay to simulate async work
  await new Promise((resolve) => setTimeout(resolve, 30))
  return {
    stats: {
      users: 1234,
      revenue: 56789,
    },
  }
}

export default function DashboardPage({ params: _params, stats }: PageProps & LoaderData) {
  return (
    <div data-page="dashboard">
      <h1>Dashboard</h1>
      <div data-stats>
        <p data-users>Users: {stats?.users ?? 0}</p>
        <p data-revenue>Revenue: ${stats?.revenue ?? 0}</p>
      </div>
    </div>
  )
}
