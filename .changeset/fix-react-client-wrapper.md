---
"@cloudwerk/ui": patch
---

Fix React renderer producing "Objects are not valid as a React child" error by making the client component wrapper renderer-agnostic. Added `createElement` to the `Renderer` interface so the hydration wrapper div is created using the active renderer's element factory at runtime, instead of compile-time Hono JSX.
