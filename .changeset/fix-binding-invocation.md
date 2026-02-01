---
"@cloudwerk/core": patch
"@cloudwerk/vite-plugin": patch
---

Fix "Illegal invocation" error when using bindings in production

- **@cloudwerk/core**: Fixed `createLazyBinding` to bind methods to the original binding object, preventing "Illegal invocation" errors when calling methods like `DB.prepare()` or `KV.get()` on Cloudflare bindings
- **@cloudwerk/vite-plugin**: Fixed static assets middleware to only intercept GET/HEAD requests, preventing request body consumption that caused "Invalid JSON body" errors on POST/PUT/PATCH requests
