---
"@cloudwerk/cli": patch
---

Fix client bundle externalizing @cloudwerk/ui/client, which caused "Failed to resolve module specifier" errors in SSG output. The hydration code must be bundled, not externalized.
