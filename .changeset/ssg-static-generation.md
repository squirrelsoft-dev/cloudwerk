---
"@cloudwerk/cli": minor
"@cloudwerk/core": patch
"@cloudwerk/vite-plugin": patch
---

feat(cli): add Static Site Generation (SSG) support

- Use `getPlatformProxy()` from wrangler to access D1/KV/R2 bindings at build time
- Use Hono's `toSSG()` helper to generate static HTML files
- Add cloudwerk plugin to SSG Vite server for proper binding transforms
- Merge user's vite config with base config during build
- Pages with `generateStaticParams` export are pre-rendered at build time

fix(core): clean up debug logging from context and bindings modules

fix(vite-plugin): ensure binding transforms work correctly in SSG mode
