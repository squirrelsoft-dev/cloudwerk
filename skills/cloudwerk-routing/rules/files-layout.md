---
title: Layout Conventions
impact: CRITICAL
tags: layout, component, nesting, html
---

## Layout Conventions

**Impact: CRITICAL**

Layouts wrap pages and nested layouts. A `layout.tsx` file applies to all routes in its directory and subdirectories. The root layout (`app/layout.tsx`) must render the full HTML document.

**Incorrect (missing children prop or HTML structure):**

```tsx
// app/layout.tsx
// ❌ Missing children - layout won't render page content
export default function RootLayout() {
  return (
    <html>
      <body>
        <nav>My App</nav>
      </body>
    </html>
  )
}

// ❌ Wrong props type
export default function RootLayout({ content }: { content: any }) {
  return <div>{content}</div>
}
```

**Correct (LayoutProps with children):**

```tsx
// app/layout.tsx
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
- Layouts **must** use a default export
- Use the `LayoutProps` type which includes `children`
- Root layout must include `<html>`, `<head>`, and `<body>` tags
- CSS can be imported with `?url` suffix for stylesheet links
- Layouts nest automatically: parent layouts wrap child layouts
- Layouts can also export `loader()` functions for data

Reference: `examples/blog/app/layout.tsx`
