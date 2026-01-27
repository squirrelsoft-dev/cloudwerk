/**
 * Test fixture: Dashboard page that throws an error in loader.
 * Should use dashboard-specific error boundary.
 */

export async function loader() {
  throw new Error('Dashboard error from loader')
}

export default function DashboardThrowsErrorPage() {
  return (
    <div data-page="dashboard-throws-error">
      <h1>This should not render</h1>
    </div>
  )
}
