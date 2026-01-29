---
"@cloudwerk/core": patch
"@cloudwerk/create-app": patch
---

Fix routes directory structure to use `app/` instead of `app/routes/`

- Fixed `resolveRoutesPath()` in core to handle when `routesDir === appDir`, preventing incorrect resolution to `app/app/`
- Updated all create-app templates to place routes directly in `app/` directory (matching Next.js convention)
- Removed `routesDir: 'app/routes'` override from template configs
- Updated installation docs to reflect actual CLI prompts
