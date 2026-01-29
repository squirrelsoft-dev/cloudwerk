import type { PageProps, LoaderArgs } from '@cloudwerk/core'

interface User {
  id: string
  name: string
  email: string
}

export async function loader({ params }: LoaderArgs<{ id: string }>) {
  // Simulate database lookup
  const users: Record<string, User> = {
    '1': { id: '1', name: 'Alice', email: 'alice@example.com' },
    '2': { id: '2', name: 'Bob', email: 'bob@example.com' },
  }

  const user = users[params.id]

  return { user: user || null }
}

export default function UserPage({
  params,
  user,
}: PageProps<{ id: string }> & { user: User | null }) {
  if (!user) {
    return (
      <div data-testid="user-not-found">
        <h1>User Not Found</h1>
        <p>User with ID {params.id} does not exist.</p>
      </div>
    )
  }

  return (
    <div data-testid="user-page">
      <h1 data-testid="user-name">{user.name}</h1>
      <p data-testid="user-email">{user.email}</p>
      <p data-testid="user-id">ID: {user.id}</p>
    </div>
  )
}
