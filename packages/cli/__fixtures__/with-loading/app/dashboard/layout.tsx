/**
 * Test fixture: Dashboard layout.
 */

import type { LayoutProps } from '@cloudwerk/core'

export default function DashboardLayout({ children }: LayoutProps) {
  return (
    <div data-layout="dashboard">
      <nav data-nav="dashboard">
        <a href="/dashboard">Overview</a>
        <a href="/dashboard/settings">Settings</a>
      </nav>
      <main>{children}</main>
    </div>
  )
}
