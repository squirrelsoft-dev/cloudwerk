---
"@cloudwerk/ui": patch
"@cloudwerk/vite-plugin": patch
---

Fix react-dom/server causing deployment failure on Cloudflare Workers due to MessageChannel not being available during upload validation. Lazy-load react-dom/server in the React renderer and add a MessageChannel polyfill to the generated server entry for React apps.
