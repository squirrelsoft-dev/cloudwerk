import type { PageProps } from '@cloudwerk/core'

export default function UserPage({ params }: PageProps<{ id: string }>) {
  return (
    <div data-testid="user-page">
      <h1>User Profile</h1>
      <p data-testid="user-id">User ID: {params.id}</p>
    </div>
  )
}
