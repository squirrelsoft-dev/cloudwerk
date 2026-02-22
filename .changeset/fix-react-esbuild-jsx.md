---
'@cloudwerk/vite-plugin': patch
---

Fix React renderer by configuring esbuild jsxImportSource to 'react' when the renderer is set to 'react', so JSX produces React elements instead of Hono JSX objects.
