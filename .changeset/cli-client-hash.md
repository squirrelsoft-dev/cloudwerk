---
"@cloudwerk/cli": patch
---

fix(cli): add content hash to client entry filename for cache busting

Changed client entry output from `client.js` to `client-[hash].js` to enable
proper browser caching with cache invalidation on content changes.
