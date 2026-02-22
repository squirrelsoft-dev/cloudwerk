---
'@cloudwerk/vite-plugin': patch
---

Fix React renderer support in server entry virtual module. Previously, the generated server entry was hard-coded for Hono JSX, causing React projects to fail at runtime. Now conditionally imports and initializes the React renderer, and uses renderToString from react-dom/server for HTML generation.
