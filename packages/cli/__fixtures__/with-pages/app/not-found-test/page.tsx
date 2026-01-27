/**
 * Test fixture: Page that throws NotFoundError in loader.
 */

import type { LoaderArgs, PageProps } from '@cloudwerk/core'
import { NotFoundError } from '@cloudwerk/core'

interface NotFoundTestData {
  message: string
}

/**
 * Loader that always throws NotFoundError.
 */
export async function loader(_args: LoaderArgs): Promise<NotFoundTestData> {
  throw new NotFoundError('Resource not found')
}

export default function NotFoundTestPage({ message }: PageProps & NotFoundTestData) {
  // This should never render because the loader always throws
  return (
    <div>
      <h1>Should Not Render</h1>
      <p>{message}</p>
    </div>
  )
}
