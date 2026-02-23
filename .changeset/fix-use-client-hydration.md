---
"@cloudwerk/cli": patch
"@cloudwerk/ui": patch
"@cloudwerk/vite-plugin": patch
---

Switch React renderer to full-tree hydration instead of island hydration. This fixes client components that receive children (e.g. `<FadeIn><h1>...</h1></FadeIn>`), context propagation across component boundaries, and hydration mismatches with motion/framer-motion. The server now embeds serialized page data as `__CLOUDWERK_DATA__` and the client reconstructs the full React component tree before calling `hydrateRoot`. Hono JSX renderer continues to use island hydration unchanged. Also fix "use client" directive handling in production builds.
