import type { LayoutProps } from '@cloudwerk/core'

export default function RootLayout({ children }: LayoutProps) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>Route Groups Test</title>
      </head>
      <body data-testid="root-layout">{children}</body>
    </html>
  )
}
