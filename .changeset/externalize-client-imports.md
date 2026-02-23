---
"@cloudwerk/cli": patch
---

Externalize @cloudwerk/* packages from the client build to prevent AsyncLocalStorage (node:async_hooks) from leaking into the browser bundle.
