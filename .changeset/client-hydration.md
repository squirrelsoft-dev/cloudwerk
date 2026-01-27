---
"@cloudwerk/core": minor
"@cloudwerk/ui": minor
"@cloudwerk/cli": minor
---

feat(cli): wire hydration infrastructure into rendering pipeline

Client components marked with `'use client'` directive are now hydrated on the client side:

- Register `/__cloudwerk/*` routes to serve client bundles and hydration runtime
- Track client components during page and layout loading
- Inject hydration scripts into HTML responses for pages with client components
- Support both Hono JSX and React renderers
- Add request-scoped manifest generation for efficient per-request hydration

The Counter component in `template-hono-jsx` is now interactive - clicking increments the count.

Closes #133
