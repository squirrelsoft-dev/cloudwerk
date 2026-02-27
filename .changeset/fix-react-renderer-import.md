---
"@cloudwerk/ui": patch
---

Fix production build failure in hono-jsx projects caused by Rollup statically analyzing the dynamic import of the React renderer. The import path is now constructed at runtime to prevent Rollup from following it into the React module graph.
