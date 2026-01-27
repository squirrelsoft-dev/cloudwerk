---
"@cloudwerk/core": minor
"@cloudwerk/ui": minor
---

feat: release hydration utilities

Release previously implemented but unpublished hydration utilities:

**@cloudwerk/core:**
- `hasUseClientDirective()` - Detect 'use client' directive
- `generateComponentId()` - Generate unique component IDs
- `createHydrationManifest()` / `addToHydrationManifest()` - Manifest creation
- `serializeProps()` / `deserializeProps()` - Props serialization for hydration
- `ClientComponentInfo`, `ClientComponentMeta`, `HydrationManifest` types

**@cloudwerk/ui:**
- `wrapForHydration()` - Wrap components with hydration metadata
- `generateHydrationScript()` / `generateReactHydrationScript()` - Bootstrap scripts
- `generatePreloadHints()` - Preload hints generation
- `generateHydrationRuntime()` / `generateReactHydrationRuntime()` - Runtime code

These utilities are required by @cloudwerk/cli@0.5.0 for client component hydration.
