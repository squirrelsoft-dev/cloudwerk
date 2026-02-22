---
title: LayoutProps Interface
impact: HIGH
tags: component, layout, props, children
---

## LayoutProps Interface

**Impact: HIGH**

Layout components wrap pages and nested layouts. They receive `children` via `LayoutProps` and can also have their own `loader()` for data fetching.

**Incorrect (wrong children handling):**

```tsx
// ❌ Using React.ReactNode or custom children type
import { ReactNode } from 'react'

export default function RootLayout({ children }: { children: ReactNode }) {
  return <div>{children}</div>
}

// ❌ Missing children entirely
export default function RootLayout() {
  return (
    <html>
      <body><nav>My App</nav></body>
    </html>
  )
}
```

**Correct (using LayoutProps):**

```tsx
import type { LayoutProps } from '@cloudwerk/core'
import stylesUrl from './styles.css?url'

export default function RootLayout({ children }: LayoutProps) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Blog - Cloudwerk</title>
        <link rel="stylesheet" href={stylesUrl} />
      </head>
      <body>
        {children}
      </body>
    </html>
  )
}
```

Key points:
- Always use `LayoutProps` from `@cloudwerk/core`
- `children` renders the page or nested layout content
- Root layout must include full HTML document (`<html>`, `<head>`, `<body>`)
- Nested layouts only need the wrapping elements, not full HTML
- CSS imports with `?url` suffix for stylesheet `<link>` tags
- Layouts can export `loader()` — data passes as additional props

Reference: `examples/blog/app/layout.tsx`
