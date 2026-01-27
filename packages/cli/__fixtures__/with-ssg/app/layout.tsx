/**
 * Root layout for SSG test fixture.
 */
import type { LayoutProps } from '@cloudwerk/core'

export default function RootLayout({ children }: LayoutProps) {
  return (
    <html lang="en">
      <head>
        <title>SSG Test</title>
      </head>
      <body data-layout="root">{children}</body>
    </html>
  )
}
