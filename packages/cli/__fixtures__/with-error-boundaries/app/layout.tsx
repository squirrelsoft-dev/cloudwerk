/**
 * Test fixture: Root layout component.
 */

export default function RootLayout({ children }: { children: unknown }) {
  return (
    <html>
      <head>
        <title>Test App</title>
      </head>
      <body data-layout="root">{children}</body>
    </html>
  )
}
