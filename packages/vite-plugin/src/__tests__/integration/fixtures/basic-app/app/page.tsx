import type { PageProps } from '@cloudwerk/core'

export default function HomePage(_props: PageProps) {
  return (
    <div data-testid="home-page">
      <h1>Welcome Home</h1>
      <p>This is the home page.</p>
    </div>
  )
}
