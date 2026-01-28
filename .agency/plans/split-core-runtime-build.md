# Plan: Split @cloudwerk/core into Runtime and Build Packages

## Problem Statement

The server bundle for Cloudflare Workers is **165KB** when it could be **~22-45KB**. The excess size comes from build-time dependencies (`fast-glob`, `esbuild`, `micromatch`, `picomatch`) being bundled into the runtime server entry.

### Root Cause

`@cloudwerk/core` is a single package that exports both:
1. **Runtime functions** needed by the server (e.g., `contextMiddleware`, `createHandlerAdapter`, `setRouteConfig`)
2. **Build-time functions** that use heavy dependencies (e.g., `scanRoutes` uses `fast-glob`, `loadConfig` uses `esbuild`)

When Vite bundles the server entry, tree-shaking cannot fully eliminate the build-time code because:
- The package is pre-bundled by tsup into a single file
- Module-level side effects prevent dead code elimination
- Circular references between exports

---

## Proposed Solution

Split `@cloudwerk/core` into separate entry points:

```
@cloudwerk/core
├── /runtime  - Lightweight runtime-only code (no Node.js deps)
├── /build    - Build-time code (scanner, config loader)
└── /         - Full package (re-exports both for backwards compat)
```

### New Package Structure

```typescript
// @cloudwerk/core/runtime - ~5KB
export {
  // Context
  getContext,
  createHandlerAdapter,
  contextMiddleware,
  runWithContext,
  createContext,

  // Route Config
  getRouteConfig,
  setRouteConfig,

  // Errors
  NotFoundError,
  RedirectError,
  notFound,

  // Response Helpers
  json, created, noContent,
  redirect, permanentRedirect,
  html, text, stream, sse,
  notFoundResponse, badRequest, unauthorized, forbidden, serverError, validationError,
  withCache, noCache,

  // Re-exports from Hono
  Hono, Context, MiddlewareHandler, Next,
}

// @cloudwerk/core/build - Full size with deps
export {
  // Scanner (uses fast-glob)
  scanRoutes,
  scanRoutesSync,
  getFileType,
  isRouteFile,
  isLayoutFile,
  isMiddlewareFile,

  // Config (uses esbuild)
  loadConfig,
  loadConfigSync,
  findConfigFile,

  // Compiler
  buildRouteManifest,
  compileRoute,
  parseSegment,
  filePathToRoutePath,

  // Resolver
  resolveLayouts,
  resolveMiddleware,
  resolveRouteContext,

  // Validator
  validateManifest,
  validateRoute,

  // Client detection
  hasUseClientDirective,
  generateComponentId,
}

// @cloudwerk/core (main entry) - Backwards compatible
export * from './runtime'
export * from './build'
```

---

## Implementation Steps

### Phase 1: Reorganize Source Files

1. Create new directory structure:
   ```
   packages/core/src/
   ├── runtime/
   │   ├── index.ts        # Runtime exports
   │   ├── context.ts      # Move from src/
   │   ├── route-config.ts # Move from src/
   │   ├── errors.ts       # Move from src/
   │   ├── helpers.ts      # Move from src/
   │   └── middleware.ts   # Move from src/
   ├── build/
   │   ├── index.ts        # Build exports
   │   ├── scanner.ts      # Move from src/
   │   ├── config.ts       # Move from src/
   │   ├── compiler.ts     # Move from src/
   │   ├── resolver.ts     # Move from src/
   │   ├── validator.ts    # Move from src/
   │   └── client.ts       # Move from src/
   ├── types.ts            # Shared types (no dependencies)
   └── index.ts            # Main entry (re-exports both)
   ```

2. Update imports within files to use relative paths

3. Ensure no circular dependencies between runtime and build

### Phase 2: Update Package Configuration

1. Update `packages/core/package.json`:
   ```json
   {
     "exports": {
       ".": {
         "types": "./dist/index.d.ts",
         "import": "./dist/index.js"
       },
       "./runtime": {
         "types": "./dist/runtime/index.d.ts",
         "import": "./dist/runtime/index.js"
       },
       "./build": {
         "types": "./dist/build/index.d.ts",
         "import": "./dist/build/index.js"
       }
     }
   }
   ```

2. Update tsup config to build multiple entry points:
   ```typescript
   // tsup.config.ts
   export default {
     entry: {
       'index': 'src/index.ts',
       'runtime/index': 'src/runtime/index.ts',
       'build/index': 'src/build/index.ts',
     },
     format: ['esm'],
     dts: true,
     splitting: true,  // Enable code splitting
     treeshake: true,
   }
   ```

### Phase 3: Update Consumers

1. **@cloudwerk/vite-plugin** - Update server entry generation:
   ```typescript
   // Before
   import { contextMiddleware, createHandlerAdapter, setRouteConfig } from '@cloudwerk/core'

   // After
   import { contextMiddleware, createHandlerAdapter, setRouteConfig } from '@cloudwerk/core/runtime'
   ```

2. **@cloudwerk/cli** - Build command uses build imports:
   ```typescript
   // Keep using full @cloudwerk/core for CLI (build-time tool)
   import { scanRoutes, buildRouteManifest, ... } from '@cloudwerk/core'
   ```

3. **Generated server entry** - Only imports from runtime:
   ```typescript
   // Generated code should only use runtime imports
   import { contextMiddleware, createHandlerAdapter, setRouteConfig } from '@cloudwerk/core/runtime'
   ```

### Phase 4: Verify and Test

1. Run all existing tests
2. Build test-hydration app and verify bundle size (~22-45KB target)
3. Test with wrangler dev to ensure runtime works
4. Check that backwards compatibility is maintained for existing code

---

## Files to Modify

| File | Change |
|------|--------|
| `packages/core/src/` | Reorganize into runtime/ and build/ subdirectories |
| `packages/core/package.json` | Add exports for /runtime and /build |
| `packages/core/tsup.config.ts` | Configure multiple entry points |
| `packages/vite-plugin/src/virtual-modules/server-entry.ts` | Import from @cloudwerk/core/runtime |
| `packages/cli/src/commands/build.ts` | No changes needed (uses full package) |

---

## Expected Results

| Metric | Before | After |
|--------|--------|-------|
| Server bundle size | 165 KB | ~22-45 KB |
| Runtime dependencies | fast-glob, esbuild, micromatch | None (just hono) |
| Build dependencies | Same | Same |
| API compatibility | N/A | 100% backwards compatible |

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Breaking existing imports | Main entry re-exports everything for backwards compat |
| Circular dependencies | Careful separation; types.ts has no deps |
| Build complexity | tsup handles multiple entries well |
| Test coverage gaps | Run full test suite after each phase |

---

## Dependencies

- None - this is an internal refactoring

---

## Verification

```bash
# After implementation, verify:

# 1. All tests pass
pnpm test

# 2. Build test-hydration
cd apps/test-hydration
pnpm test-build

# 3. Check bundle size (target: <50KB)
ls -la dist/index.js

# 4. Verify no fast-glob/esbuild in bundle
grep -c "fast-glob\|esbuild\|micromatch" dist/index.js
# Should output: 0

# 5. Test runtime works
npx wrangler dev dist/index.js
```

---

## Timeline Estimate

- Phase 1: File reorganization
- Phase 2: Package configuration
- Phase 3: Update consumers
- Phase 4: Testing and verification

---

## References

- Investigation: `.agency/plans/investigate-hono-vite-build-virtual-modules.md`
- Related issue: Bundle size optimization
- @hono/vite-build source: Uses `import.meta.glob()` which requires filesystem paths
