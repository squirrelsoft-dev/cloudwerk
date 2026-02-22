---
title: Client Component Directive
impact: HIGH
tags: client, interactive, use-client, hydration
---

## Client Component Directive

**Impact: HIGH**

Components that need browser interactivity (state, effects, event handlers) must use the `'use client'` directive at the top of the file. Without it, components render server-side only.

**Incorrect (interactive code without directive):**

```tsx
// ❌ Missing 'use client' — useState won't work server-side
import { useState } from 'react'

export default function Counter() {
  const [count, setCount] = useState(0)
  return (
    <button onClick={() => setCount(c => c + 1)}>
      Count is {count}
    </button>
  )
}
```

**Correct ('use client' directive):**

```tsx
'use client'

import { useState } from 'react'

export default function Counter() {
  const [count, setCount] = useState(0)

  return (
    <button
      onClick={() => setCount((c) => c + 1)}
      className="px-6 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
    >
      Count is {count}
    </button>
  )
}
```

Key points:
- `'use client'` must be the first line of the file (before imports)
- Required for: `useState`, `useEffect`, `useRef`, event handlers (`onClick`, etc.)
- Client components are hydrated in the browser after SSR
- Server components (default) cannot use React hooks or browser APIs
- Requires the `react` renderer in `cloudwerk.config.ts` — hono-jsx does not support client components
- Keep client components small and leaf-level when possible

Reference: `examples/react-renderer/app/components/counter.tsx`
