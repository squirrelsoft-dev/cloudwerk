---
"@cloudwerk/create-app": patch
---

fix(create-app): add tsconfig paths support to hono-jsx template

- Added `vite-tsconfig-paths` plugin for path alias resolution
- Moved components from `app/components/` to root `components/` directory
- Added `@/*` path alias pointing to project root
- Updated imports to use `@/components/counter` style
