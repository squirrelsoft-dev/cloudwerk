---
"@cloudwerk/cli": patch
---

Bump @cloudwerk/vite-plugin dependency to pick up the unused import stripping fix, which prevents browser errors in Vite dev mode when server-only imports reference Node.js APIs.
