import type { PageProps, LoaderArgs } from '@cloudwerk/core'

export async function loader(_args: LoaderArgs) {
  throw new Error('Intentional error from loader')
}

export default function ThrowsErrorPage(_props: PageProps) {
  return (
    <div>
      <h1>This page throws an error</h1>
    </div>
  )
}
