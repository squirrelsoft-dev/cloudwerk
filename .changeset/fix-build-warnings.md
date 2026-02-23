---
"@cloudwerk/cli": patch
"@cloudwerk/vite-plugin": patch
---

Surface client build failures as visible warnings instead of silently swallowing them. Fix Rollup onwarn regex to properly suppress expected MISSING_EXPORT warnings for optional page exports. Add Vite 7 to peer dependencies. Externalize @cloudwerk/* packages from the client build to prevent AsyncLocalStorage (node:async_hooks) from leaking into the browser bundle.
