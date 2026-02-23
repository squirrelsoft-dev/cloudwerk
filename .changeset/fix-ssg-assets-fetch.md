---
"@cloudwerk/cli": patch
---

Fix SSG "Failed to parse URL from [object Request]" error by skipping ASSETS middleware during static generation and adding a try/catch fallback for ASSETS.fetch
