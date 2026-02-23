import type { PageProps } from '@cloudwerk/core'

export const config = {
  rendering: 'static',
}

export default function AboutPage(_props: PageProps) {
  return (
    <div>
      <h1>About</h1>
      <p>This is a simple static page with no loader.</p>
      <nav>
        <a href="/">Home</a>
      </nav>
    </div>
  )
}
