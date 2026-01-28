---
"@cloudwerk/core": minor
"@cloudwerk/cli": patch
"@cloudwerk/ui": patch
"@cloudwerk/vite-plugin": patch
---

Split @cloudwerk/core into /runtime and /build subpackages for smaller Worker bundles

- Add `@cloudwerk/core/runtime` entry point (10.8KB) with context, middleware, errors, and response helpers
- Add `@cloudwerk/core/build` entry point (35.7KB) with compiler, scanner, resolver, and config utilities
- Main `@cloudwerk/core` entry remains backwards compatible by re-exporting from both
- Update consumer packages to import from appropriate subpackages
