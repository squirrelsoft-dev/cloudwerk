/**
 * Test fixture: Dashboard layout component (nested).
 */

export default function DashboardLayout({ children }: { children: unknown }) {
  return (
    <main data-layout="dashboard">
      <nav>Dashboard Nav</nav>
      <section>{children}</section>
    </main>
  )
}
