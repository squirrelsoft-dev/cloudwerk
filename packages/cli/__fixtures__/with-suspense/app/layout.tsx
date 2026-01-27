/**
 * Root layout for Suspense test fixture.
 */

import type { LayoutProps } from '@cloudwerk/core'

export default function RootLayout({ children }: LayoutProps) {
  return (
    <html lang="en">
      <head>
        <title>Suspense Test</title>
      </head>
      <body data-layout="root">{children}</body>
    </html>
  )
}
