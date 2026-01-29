import type { LayoutProps } from '@cloudwerk/core'

export default function RootLayout({ children }: LayoutProps) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>Test App</title>
      </head>
      <body>
        <header data-testid="header">
          <nav>
            <a href="/">Home</a>
            <a href="/about">About</a>
          </nav>
        </header>
        <main data-testid="main">{children}</main>
      </body>
    </html>
  )
}
