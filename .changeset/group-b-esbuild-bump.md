---
"@cloudwerk/core": patch
"@cloudwerk/cli": patch
---

Bump esbuild from ^0.25.0 to ^0.28.0 and update pnpm.overrides.esbuild pin from ^0.25.0 to ^0.28.0. esbuild 0.28.1 fixes a Windows path-traversal in the dev server (GHSA-g7r4-m6w7-qqqr); cloudwerk uses the build/transform API, not serve().