import type { LayoutProps } from '@cloudwerk/core'

export default function DashboardLayout({ children }: LayoutProps) {
  return (
    <div data-testid="dashboard-layout">
      <nav data-testid="dashboard-nav">Dashboard Nav</nav>
      <div data-testid="dashboard-content">{children}</div>
    </div>
  )
}
