import type { LayoutProps } from '@cloudwerk/core'
import './globals.css'

export default function RootLayout({ children }: LayoutProps) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Linkly - Link Shortener</title>
        {/* CSS auto-injected from globals.css import */}
      </head>
      <body class="bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-h-screen">
        {children}
      </body>
    </html>
  )
}
