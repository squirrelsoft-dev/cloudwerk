---
"@cloudwerk/cli": patch
---

Surface client build failures as visible warnings instead of silently swallowing them. Fix Rollup onwarn regex to properly suppress expected MISSING_EXPORT warnings for optional page exports.
