---
"@cloudwerk/core": minor
"@cloudwerk/vite-plugin": minor
"@cloudwerk/cli": patch
---

Add publicDir configuration for serving static assets from public/ folder

- Added `publicDir` option to `CloudwerkConfig` (default: "public")
- Vite plugin now passes `publicDir` to Vite's built-in static file serving
- Fixed CLI build command to avoid duplicating static assets in dist/ output
- Added integration tests for static asset serving
