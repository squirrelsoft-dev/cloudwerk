import type { PageProps } from '@cloudwerk/core'

export default function HomePage(_props: PageProps) {
  return (
    <html>
      <head>
        <title>Static Assets Test</title>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>
        <h1 data-testid="home">Home</h1>
        <img src="/images/logo.png" alt="Logo" />
      </body>
    </html>
  )
}
