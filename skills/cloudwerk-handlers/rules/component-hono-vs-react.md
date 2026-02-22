---
title: Hono JSX vs React Renderer
impact: MEDIUM
tags: renderer, hono-jsx, react, class, className
---

## Hono JSX vs React Renderer

**Impact: MEDIUM**

Cloudwerk supports two renderers: `hono-jsx` (default) and `react`. They have different JSX attribute conventions. Choosing the wrong one causes silent rendering issues.

**Incorrect (mixing conventions):**

```tsx
// ❌ Using className with hono-jsx renderer
// cloudwerk.config.ts: ui: { renderer: 'hono-jsx' }
export default function Page() {
  return <div className="text-lg">Hello</div>  // className is ignored in hono-jsx!
}

// ❌ Using class with react renderer
// cloudwerk.config.ts: ui: { renderer: 'react' }
export default function Page() {
  return <div class="text-lg">Hello</div>  // TypeScript error in React
}
```

**Correct (matching convention to renderer):**

```tsx
// hono-jsx renderer — use 'class'
// cloudwerk.config.ts: ui: { renderer: 'hono-jsx' }
export default function Page() {
  return (
    <div class="min-h-screen bg-gray-100 py-12 px-4">
      <h1 class="text-4xl font-bold">Hello</h1>
    </div>
  )
}

// react renderer — use 'className'
// cloudwerk.config.ts: ui: { renderer: 'react' }
export default function Page() {
  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4">
      <h1 className="text-4xl font-bold">Hello</h1>
    </div>
  )
}
```

Key differences:

| Feature | hono-jsx | react |
|---------|----------|-------|
| CSS classes | `class` | `className` |
| For attribute | `for` | `htmlFor` |
| Client components | Not supported | Supported (`'use client'`) |
| React hooks | Not available | Available |
| Bundle size | Smaller (no React) | Larger (includes React) |

Check the renderer in `cloudwerk.config.ts`:

```typescript
import { defineConfig } from '@cloudwerk/core'

export default defineConfig({
  ui: {
    renderer: 'hono-jsx', // or 'react'
  },
})
```

Reference: `examples/blog/cloudwerk.config.ts` (hono-jsx), `examples/react-renderer/cloudwerk.config.ts` (react)
