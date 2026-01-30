---
"@cloudwerk/core": minor
"@cloudwerk/cli": minor
"@cloudwerk/vite-plugin": minor
---

Add importable binding singletons and context helpers

**@cloudwerk/core:**
- Add `@cloudwerk/core/bindings` module with proxy-based binding access (`bindings`, `getBinding`, `hasBinding`, `getBindingNames`)
- Add `@cloudwerk/core/context` module with context helpers (`params`, `request`, `env`, `executionCtx`, `getRequestId`, `get`, `set`)

**@cloudwerk/cli:**
- Update `bindings generate-types` to generate `.cloudwerk/types/` for typed importable bindings
- Automatically update `tsconfig.json` with paths for `@cloudwerk/core/bindings` and `@cloudwerk/core/context`

**@cloudwerk/vite-plugin:**
- Watch `wrangler.toml` for changes and auto-regenerate `.cloudwerk/types/` during development
