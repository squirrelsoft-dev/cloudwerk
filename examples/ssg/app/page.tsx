import type { PageProps, LoaderArgs } from '@cloudwerk/core'

export const config = {
  rendering: 'static',
}

export async function loader(_args: LoaderArgs) {
  return { greeting: 'Hello from SSG!' }
}

interface HomePageProps extends PageProps {
  greeting: string
}

export default function HomePage({ greeting }: HomePageProps) {
  return (
    <div>
      <h1>{greeting}</h1>
      <p>This page was statically generated.</p>
      <nav>
        <a href="/about">About</a>
      </nav>
    </div>
  )
}
