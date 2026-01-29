import type { PageProps } from '@cloudwerk/core'

export default function DocsPage({ params }: PageProps<{ slug: string }>) {
  return (
    <div data-testid="docs-page">
      <h1>Documentation</h1>
      <p data-testid="docs-slug">Slug: {params.slug}</p>
    </div>
  )
}
