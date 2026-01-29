---
"@cloudwerk/core": minor
"@cloudwerk/vite-plugin": minor
---

Add support for error.tsx and not-found.tsx boundary pages

- Error boundaries catch errors in loaders and render custom error UI
- Not-found boundaries render when NotFoundError is thrown or for 404s
- Nested boundaries override parent boundaries (closest wins)
- API routes return JSON errors, page routes render HTML boundaries
