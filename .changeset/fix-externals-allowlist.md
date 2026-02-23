---
"@cloudwerk/cli": patch
---

Use allowlist for client-safe @cloudwerk packages instead of individual exceptions. Fixes "Failed to resolve module specifier @cloudwerk/utils" in SSG output by ensuring the full hydration dependency chain is bundled.
