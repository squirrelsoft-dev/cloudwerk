---
"@cloudwerk/core": patch
"@cloudwerk/vite-plugin": patch
---

Fix middleware and catch-all route handling

- Fix middleware import to use named export `{ middleware }`
- Wrap middleware with `createMiddlewareAdapter` for Hono compatibility
- Fix catch-all route patterns to use Hono-compatible `:slug{.+}` syntax
- Fix optional catch-all patterns to use `:slug{.*}` with base path registration
