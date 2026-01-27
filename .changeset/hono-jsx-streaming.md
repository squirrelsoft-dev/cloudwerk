---
"@cloudwerk/ui": minor
"@cloudwerk/cli": minor
---

feat(ui): add renderToStream() for native progressive streaming with Suspense support

- Add `renderToStream()` function using Hono's `renderToReadableStream`
- Support Suspense boundaries for async component streaming
- Automatically prepend DOCTYPE html to streams
- Configure with status, headers, and doctype options
