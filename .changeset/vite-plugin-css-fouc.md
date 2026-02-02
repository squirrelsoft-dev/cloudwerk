---
"@cloudwerk/vite-plugin": patch
---

fix(vite-plugin): prevent flash of unstyled content (FOUC) in dev mode

- Inject CSS links server-side during SSR in development mode
- Use `/@fs` prefix for Vite to serve CSS with HMR support
- Deduplicate CSS imports from multiple files
- Use content-hashed client entry path from asset manifest in production
