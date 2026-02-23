---
"@cloudwerk/vite-plugin": patch
---

Strip unused imports after removing server exports. When `stripServerExports` removes server-only exports (loader, config, generateStaticParams), imports that were only used by those exports are now also removed. This prevents browser errors in Vite dev mode when server-only imports reference Node.js APIs.
