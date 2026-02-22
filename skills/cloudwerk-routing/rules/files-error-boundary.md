---
title: Error Boundary Conventions
impact: HIGH
tags: error, boundary, error-handling, catch
---

## Error Boundary Conventions

**Impact: HIGH**

Error boundaries (`error.tsx`) catch errors from loaders, actions, and component rendering. They display fallback UI instead of crashing the page. The nearest error boundary in the directory tree catches the error.

**Incorrect (missing required props):**

```tsx
// app/error.tsx
// ❌ Missing error prop and ErrorBoundaryProps type
export default function ErrorPage() {
  return <h1>Something went wrong</h1>
}
```

**Correct (ErrorBoundaryProps with error info):**

```tsx
// app/error.tsx
import type { ErrorBoundaryProps } from '@cloudwerk/core'

export default function ErrorBoundary({
  error,
  errorType,
  reset,
  params,
  searchParams,
}: ErrorBoundaryProps) {
  return (
    <div>
      <h1>Something went wrong!</h1>
      <p>{error.message}</p>
      {error.digest && <p>Error ID: {error.digest}</p>}
      <p>Error source: {errorType}</p>
    </div>
  )
}
```

Key points:
- Export a default component with `ErrorBoundaryProps`
- `error` includes the thrown `Error` with optional `digest` for production log matching
- `errorType` indicates the source: `'loader'`, `'action'`, `'render'`, or `'unknown'`
- `reset` is a recovery function (no-op during SSR)
- Place `error.tsx` at any route level — the nearest boundary catches errors
- Route-specific boundaries (e.g., `app/dashboard/error.tsx`) catch errors only in that subtree

Reference: `examples/feature-flags/app/error.tsx`
