/**
 * Home page - SSR (default)
 */
import type { PageProps } from '@cloudwerk/core'

export default function HomePage({ params: _params }: PageProps) {
  return (
    <div data-page="home">
      <h1>Home Page (SSR)</h1>
      <p>This page is server-rendered.</p>
    </div>
  )
}
