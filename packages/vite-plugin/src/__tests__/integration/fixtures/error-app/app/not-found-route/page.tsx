import type { PageProps, LoaderArgs } from '@cloudwerk/core'
import { NotFoundError } from '@cloudwerk/core'

export async function loader(_args: LoaderArgs) {
  throw new NotFoundError('Resource not found in loader')
}

export default function NotFoundRoutePage(_props: PageProps) {
  return (
    <div>
      <h1>This page should not render</h1>
    </div>
  )
}
