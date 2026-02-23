---
"@cloudwerk/vite-plugin": minor
---

Strip server-only exports (loader, config, generateStaticParams) from page/layout modules in client bundles to prevent leaking server code and avoid runtime errors from server-only imports.
