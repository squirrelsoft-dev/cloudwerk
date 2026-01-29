import type { PageProps } from '@cloudwerk/core'

export default function HomePage({ params: _params }: PageProps) {
  return (
    <div>
      <h1>Home Page</h1>
      <p>This page works normally.</p>
      <h2>Test Scenarios:</h2>
      <ul>
        <li><a href="/throws-error">Page that throws error in loader</a> - Should show root error.tsx</li>
        <li><a href="/throws-not-found">Page that throws NotFoundError</a> - Should show root not-found.tsx</li>
        <li><a href="/nonexistent">Nonexistent page</a> - Should show root not-found.tsx (404)</li>
        <li><a href="/dashboard">Dashboard page</a> - Works normally</li>
        <li><a href="/dashboard/throws-error">Dashboard error</a> - Should show dashboard/error.tsx</li>
        <li><a href="/api/users">API users endpoint</a> - Returns JSON</li>
        <li><a href="/api/nonexistent">API nonexistent</a> - Returns JSON 404</li>
      </ul>
    </div>
  )
}
