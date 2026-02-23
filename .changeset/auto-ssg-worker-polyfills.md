---
"@cloudwerk/cli": minor
"@cloudwerk/vite-plugin": patch
---

Auto-SSG and Worker polyfills for React renderer

- **Auto-SSG**: Static page generation now runs automatically during `cloudwerk build` for routes with `rendering: 'static'` or `generateStaticParams`. The `--ssg` flag is no longer needed (use `--no-ssg` to opt out).
- **SSG route filtering**: Only routes explicitly marked as static are generated. Dynamic pages and API routes are no longer captured by SSG.
- **Worker polyfills**: `MessageChannel` and `document` polyfills are now automatically injected via Rollup banner for React renderer builds, fixing crashes from libraries like `react-markdown`/`micromark` that use `document.createElement` at module load time.
