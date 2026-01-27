/**
 * Test fixture: Dashboard loading boundary component.
 */

import type { LoadingProps } from '@cloudwerk/core'

export default function DashboardLoading({ pathname }: LoadingProps) {
  return (
    <div data-loading="dashboard">
      <p data-loading-message>Loading dashboard...</p>
      <p data-loading-pathname>{pathname}</p>
    </div>
  )
}
