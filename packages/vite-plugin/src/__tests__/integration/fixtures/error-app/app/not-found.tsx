import type { NotFoundProps } from '@cloudwerk/core'

export default function NotFound(_props: NotFoundProps) {
  return (
    <div data-testid="root-not-found">
      <h1>404 - Page Not Found</h1>
      <p>The page you are looking for does not exist.</p>
    </div>
  )
}
