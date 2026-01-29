import type { NotFoundProps } from '@cloudwerk/core'

export default function RootNotFound({ params, searchParams }: NotFoundProps) {
  return (
    <div class="not-found">
      <h1>404 - Page Not Found</h1>
      <p>This is the root not-found.tsx boundary.</p>
      <p>The page you're looking for doesn't exist.</p>
      <p><a href="/">Go back home</a></p>
    </div>
  )
}
