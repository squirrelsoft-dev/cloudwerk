import type { LayoutProps } from '@cloudwerk/core'

export default function RootLayout({ children }: LayoutProps) {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Error Pages Test</title>
        <style>{`
          body { font-family: system-ui, sans-serif; margin: 0; padding: 20px; }
          nav { margin-bottom: 20px; padding: 10px; background: #f0f0f0; }
          nav a { margin-right: 15px; }
          .error { background: #fee; padding: 20px; border: 1px solid #f00; border-radius: 8px; }
          .not-found { background: #fef; padding: 20px; border: 1px solid #f0f; border-radius: 8px; }
          .dashboard-error { background: #ffe; padding: 20px; border: 1px solid #ff0; border-radius: 8px; }
        `}</style>
      </head>
      <body>
        <nav>
          <a href="/">Home</a>
          <a href="/dashboard">Dashboard</a>
          <a href="/throws-error">Throws Error</a>
          <a href="/throws-not-found">Throws NotFound</a>
          <a href="/nonexistent">Nonexistent Page</a>
          <a href="/dashboard/throws-error">Dashboard Error</a>
          <a href="/api/users">API Users</a>
          <a href="/api/nonexistent">API Nonexistent</a>
        </nav>
        {children}
      </body>
    </html>
  )
}
