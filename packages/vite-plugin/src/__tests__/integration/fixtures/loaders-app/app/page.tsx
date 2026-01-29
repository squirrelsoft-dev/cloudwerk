import type { PageProps, LoaderArgs } from '@cloudwerk/core'

export async function loader({ request }: LoaderArgs) {
  const url = new URL(request.url)
  const name = url.searchParams.get('name') || 'Guest'
  return {
    greeting: `Hello, ${name}!`,
    timestamp: new Date().toISOString(),
  }
}

export default function HomePage({
  greeting,
  searchParams,
}: PageProps & { greeting: string }) {
  return (
    <div data-testid="home-page">
      <h1 data-testid="greeting">{greeting}</h1>
      <p data-testid="search-params">
        Search params: {JSON.stringify(searchParams)}
      </p>
    </div>
  )
}
