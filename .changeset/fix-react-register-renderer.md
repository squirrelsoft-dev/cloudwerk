---
"@cloudwerk/ui": patch
"@cloudwerk/vite-plugin": patch
---

Fix React renderer initialization failure on Cloudflare Workers by replacing dynamic import in initReactRenderer with static import and registerRenderer. The dynamic import caused a TDZ error when Vite inlined the module into a single chunk.
