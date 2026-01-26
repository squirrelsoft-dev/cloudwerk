---
"@cloudwerk/cli": patch
---

Fix workspace protocol resolution - use workspace:^ instead of workspace:* so pnpm converts it to proper semver on publish
