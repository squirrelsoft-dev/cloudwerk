/**
 * About page - Static (no dynamic segments)
 */
import type { PageProps, RouteConfig } from '@cloudwerk/core'

export const config: RouteConfig = {
  rendering: 'static',
}

export default function AboutPage({ params: _params }: PageProps) {
  return (
    <div data-page="about">
      <h1>About Page (Static)</h1>
      <p>This page is pre-rendered at build time.</p>
    </div>
  )
}
