/**
 * Test fixture: Dashboard layout component.
 */

export default function DashboardLayout({ children }: { children: unknown }) {
  return (
    <div data-layout="dashboard">
      <nav>Dashboard Navigation</nav>
      {children}
    </div>
  )
}
