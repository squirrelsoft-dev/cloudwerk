/**
 * Test fixture: User detail page with dynamic params and loader.
 */

import type { PageProps, LoaderArgs } from '@cloudwerk/core'
import { NotFoundError } from '@cloudwerk/core'

interface UserPageParams {
  id: string
}

interface UserPageData {
  userName: string
  userEmail: string
}

/**
 * Loader that fetches user data.
 * Throws NotFoundError for id '404'.
 */
export async function loader({
  params,
}: LoaderArgs<UserPageParams>): Promise<UserPageData> {
  // Simulate not found for testing
  if (params.id === '404') {
    throw new NotFoundError('User not found')
  }

  // Simulate async data loading
  await Promise.resolve()

  return {
    userName: `User ${params.id}`,
    userEmail: `user${params.id}@example.com`,
  }
}

export default function UserPage({
  params,
  searchParams,
  userName,
  userEmail,
}: PageProps<UserPageParams> & UserPageData) {
  return (
    <div>
      <h1>User: {params.id}</h1>
      {userName && <p data-testid="user-name">Name: {userName}</p>}
      {userEmail && <p data-testid="user-email">Email: {userEmail}</p>}
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
