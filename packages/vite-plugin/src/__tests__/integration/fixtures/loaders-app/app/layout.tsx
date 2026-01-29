import type { LayoutProps, LoaderArgs } from '@cloudwerk/core'

export async function loader(_args: LoaderArgs) {
  return {
    appName: 'Loaders Test App',
  }
}

export default function RootLayout({ children, appName }: LayoutProps & { appName: string }) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>{appName}</title>
      </head>
      <body>
        <header data-testid="app-name">{appName}</header>
        {children}
      </body>
    </html>
  )
}
