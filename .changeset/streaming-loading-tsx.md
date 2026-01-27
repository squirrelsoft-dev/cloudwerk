---
"@cloudwerk/core": minor
"@cloudwerk/cli": minor
"@cloudwerk/ui": minor
---

Add loading.tsx for streaming and suspense boundaries

- `loading.tsx` components display immediately during navigation while loaders fetch data
- Uses streaming HTML responses for instant visual feedback
- Loading boundaries render within parent layouts
- Streaming can be disabled per-route via `config.streaming = false`
- Closest loading boundary wins (nested takes precedence)
