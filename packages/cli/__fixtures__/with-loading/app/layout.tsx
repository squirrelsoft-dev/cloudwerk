/**
 * Test fixture: Root layout with loading support.
 */

import type { LayoutProps } from '@cloudwerk/core'

export default function RootLayout({ children }: LayoutProps) {
  return (
    <html>
      <head>
        <title>Loading Test App</title>
      </head>
      <body data-layout="root">{children}</body>
    </html>
  )
}
