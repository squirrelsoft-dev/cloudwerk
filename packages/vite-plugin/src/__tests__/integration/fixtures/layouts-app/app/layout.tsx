import type { LayoutProps } from '@cloudwerk/core'

export default function RootLayout({ children }: LayoutProps) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>Layouts Test</title>
      </head>
      <body>
        <div data-testid="root-layout">
          <header data-testid="root-header">Root Header</header>
          {children}
          <footer data-testid="root-footer">Root Footer</footer>
        </div>
      </body>
    </html>
  )
}
