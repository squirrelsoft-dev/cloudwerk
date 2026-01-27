/**
 * Test fixture: User layout with loader function.
 */

import type { LoaderArgs, LayoutProps } from '@cloudwerk/core'

interface UserLayoutParams {
  id: string
}

interface UserLayoutData {
  navItems: string[]
}

/**
 * Loader that provides navigation data for the user layout.
 */
export async function loader({
  params: _params,
}: LoaderArgs<UserLayoutParams>): Promise<UserLayoutData> {
  // Simulate async data loading
  await Promise.resolve()
  return {
    navItems: ['Profile', 'Settings', 'Activity'],
  }
}

export default function UserLayout({
  children,
  params,
  navItems,
}: LayoutProps<UserLayoutParams> & UserLayoutData) {
  return (
    <div data-layout="user" data-user-id={params.id}>
      <nav data-testid="user-nav">
        {navItems?.map((item) => (
          <a key={item} href={`/users/${params.id}/${item.toLowerCase()}`}>
            {item}
          </a>
        ))}
      </nav>
      <div data-testid="user-content">{children}</div>
    </div>
  )
}
