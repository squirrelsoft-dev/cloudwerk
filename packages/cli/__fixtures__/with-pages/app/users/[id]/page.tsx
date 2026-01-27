/**
 * Test fixture: User detail page with dynamic params.
 */

import type { PageProps } from '@cloudwerk/core'

interface UserPageParams {
  id: string
}

export default function UserPage({
  params,
  searchParams,
}: PageProps<UserPageParams>) {
  return (
    <div>
      <h1>User: {params.id}</h1>
      {searchParams.tab && <p>Tab: {searchParams.tab}</p>}
      {searchParams.ref && (
        <p>
          Ref:{' '}
          {Array.isArray(searchParams.ref)
            ? searchParams.ref.join(', ')
            : searchParams.ref}
        </p>
      )}
    </div>
  )
}
