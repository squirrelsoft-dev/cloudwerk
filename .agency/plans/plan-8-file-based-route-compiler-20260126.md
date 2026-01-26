# Implementation Plan: File-Based Route Compiler

| Field | Value |
|-------|-------|
| **Date** | 2026-01-26 |
| **Issue** | [#8](https://github.com/squirrelsoft-dev/cloudwerk/issues/8) |
| **Reviewer** | Backend Architect Agent |
| **Status** | Ready for Implementation |
| **Milestone** | v0.1.0 - First Spike: Hello Cloudwerk |

---

## Summary

Implement the core routing compiler for `@cloudwerk/core` that maps filesystem structure to Hono routes. This is the foundational component for Cloudwerk's file-based routing system, enabling developers to define routes by creating files in `app/routes/` that compile to a single Hono application.

---

## Scope

### In Scope
- File system scanning to discover route files
- Path compilation: filesystem paths → URL patterns
- Dynamic route segment parsing (`[param]`, `[...param]`, `[[...param]]`)
- Route group handling (parentheses directories)
- Middleware and layout file detection
- Route manifest generation
- TypeScript types for all exports
- Unit tests for route mapping logic
- Response helpers (json, redirect, html, notFound)
- Config loading (`cloudwerk.config.ts`)

### Out of Scope
- Hono app registration (that's `@cloudwerk/cli`'s job)
- SSR/rendering pipeline (Phase 2+)
- Hot module replacement (dev server responsibility)
- Type generation for route params (`.cloudwerk/routes.d.ts` - separate issue)
- Rate limiting, CORS, auth middleware (future packages)

---

## Technical Approach

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      @cloudwerk/core                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐    ┌──────────┐    ┌─────────────────────┐   │
│  │ scanner  │───▶│ compiler │───▶│ manifest (output)   │   │
│  └──────────┘    └──────────┘    └─────────────────────┘   │
│       │               │                                     │
│       │               │          ┌─────────────────────┐   │
│       │               └─────────▶│ validator           │   │
│       │                          └─────────────────────┘   │
│       │                                                     │
│       ▼                          ┌─────────────────────┐   │
│  ┌──────────┐                    │ resolver            │   │
│  │ config   │                    │ (layouts/middleware)│   │
│  └──────────┘                    └─────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    helpers                           │   │
│  │  (json, redirect, html, notFound, Hono re-exports)  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Input**: `app/routes/` directory path
2. **Scan**: `scanner.ts` uses fast-glob to find all route files
3. **Parse**: Each file path is parsed into segments
4. **Compile**: `compiler.ts` transforms paths to URL patterns
5. **Resolve**: `resolver.ts` determines middleware/layout inheritance
6. **Validate**: `validator.ts` checks for conflicts and errors
7. **Output**: `RouteManifest` object ready for CLI consumption

### Route Mapping Rules

| Filesystem Path | URL Pattern | Notes |
|-----------------|-------------|-------|
| `index.ts` | `/` | Root route |
| `about/page.tsx` | `/about` | Static page |
| `users/[id]/route.ts` | `/users/:id` | Dynamic segment |
| `docs/[...path]/page.tsx` | `/docs/*path` | Catch-all |
| `shop/[[...cat]]/page.tsx` | `/shop/:cat*` | Optional catch-all |
| `(marketing)/about/page.tsx` | `/about` | Route group (removed) |

### Tech Stack

| Component | Technology | Rationale |
|-----------|------------|-----------|
| Router | Hono ^4.0 | Target framework per RFC |
| File scanning | fast-glob ^3.3 | Performance, glob patterns, ignore support |
| Testing | Vitest ^1.0 | ESM support, fast, Jest-compatible |
| Build | tsup ^8.0 | Simple, handles ESM/types |
| Types | TypeScript ^5 | Workspace standard |

---

## File Changes

### New Files

| File | Purpose | Est. LOC |
|------|---------|----------|
| `packages/core/package.json` | Package config with dependencies | ~40 |
| `packages/core/tsconfig.json` | TypeScript config | ~20 |
| `packages/core/vitest.config.ts` | Test configuration | ~15 |
| `packages/core/src/index.ts` | Package exports | ~30 |
| `packages/core/src/types.ts` | Type definitions | ~100 |
| `packages/core/src/scanner.ts` | File system scanning | ~60 |
| `packages/core/src/compiler.ts` | Path compilation logic | ~150 |
| `packages/core/src/resolver.ts` | Layout/middleware resolution | ~80 |
| `packages/core/src/validator.ts` | Route validation | ~60 |
| `packages/core/src/config.ts` | Config loading | ~50 |
| `packages/core/src/helpers.ts` | Response helpers | ~40 |
| `packages/core/src/__tests__/compiler.test.ts` | Compiler tests | ~200 |
| `packages/core/src/__tests__/scanner.test.ts` | Scanner tests | ~80 |
| `packages/core/src/__tests__/resolver.test.ts` | Resolver tests | ~80 |

**Total Estimated LOC**: ~1000

### Modified Files

| File | Change |
|------|--------|
| `packages/core/package.json` | Replace minimal with full config |

---

## Implementation Phases

### Phase 1: Package Setup

**Goal**: Establish package infrastructure

**Tasks**:
1. Update `packages/core/package.json` with dependencies and scripts
2. Create `tsconfig.json` extending workspace config
3. Create `vitest.config.ts`
4. Verify `pnpm install` works

**Files**:
- `packages/core/package.json`
- `packages/core/tsconfig.json`
- `packages/core/vitest.config.ts`

**Acceptance Criteria**:
- [ ] `pnpm install` succeeds
- [ ] `pnpm --filter @cloudwerk/core build` runs (empty output ok)
- [ ] `pnpm --filter @cloudwerk/core test` runs (no tests yet ok)

---

### Phase 2: Type Definitions

**Goal**: Define all interfaces before implementation

**Tasks**:
1. Define `RouteModule` interface (GET, POST, middleware, config, loader, default)
2. Define `RouteSegment` type (static, dynamic, catchAll, optionalCatchAll, group)
3. Define `CompiledRoute` interface
4. Define `RouteManifest` interface
5. Define `CloudwerkConfig` interface
6. Define validation error types
7. Export types from `src/index.ts`

**Files**:
- `packages/core/src/types.ts`
- `packages/core/src/index.ts` (partial)

**Key Types**:
```typescript
interface RouteModule {
  GET?: RouteHandler
  POST?: RouteHandler
  PUT?: RouteHandler
  PATCH?: RouteHandler
  DELETE?: RouteHandler
  HEAD?: RouteHandler
  OPTIONS?: RouteHandler
  ALL?: RouteHandler
  middleware?: MiddlewareHandler | MiddlewareHandler[]
  config?: RouteConfig
  loader?: LoaderFunction
  default?: ComponentFunction
}

interface CompiledRoute {
  readonly path: string
  readonly filePath: string
  readonly methods: readonly HttpMethod[]
  readonly middleware: readonly string[]
  readonly layouts: readonly string[]
  readonly isPage: boolean
  readonly hasContentNegotiation: boolean
}

interface RouteManifest {
  routes: CompiledRoute[]
  middleware: Map<string, string>
  layouts: Map<string, string>
  errors: ValidationError[]
}
```

**Acceptance Criteria**:
- [ ] All types compile without errors
- [ ] Types exported from package

---

### Phase 3: Path Compiler (Core Logic)

**Goal**: Implement pure transformation functions

**Tasks**:
1. `parseSegment(segment: string): RouteSegment` - Parse single path segment
2. `filePathToRoutePath(filePath: string, routesDir: string): string` - Main transformation
3. `sortRoutes(routes: CompiledRoute[]): CompiledRoute[]` - Ordering for Hono
4. `compileRoute(filePath: string, routesDir: string): CompiledRoute` - Single file compilation

**Files**:
- `packages/core/src/compiler.ts`
- `packages/core/src/__tests__/compiler.test.ts`

**Algorithm for `filePathToRoutePath`**:
```
1. Strip routesDir prefix
2. Strip file extension and special names (page, route, _layout, middleware)
3. Handle index → /
4. Split into segments
5. Filter out route groups (parentheses)
6. Transform dynamic segments:
   - [param] → :param
   - [...param] → *param
   - [[...param]] → :param* (optional)
7. Join with /
8. Ensure leading /
```

**Test Cases**:
- Basic: `index.ts` → `/`, `about/page.tsx` → `/about`
- Nested: `dashboard/settings/page.tsx` → `/dashboard/settings`
- Dynamic: `users/[id]/route.ts` → `/users/:id`
- Multiple dynamic: `users/[userId]/posts/[postId]/route.ts` → `/users/:userId/posts/:postId`
- Catch-all: `docs/[...path]/page.tsx` → `/docs/*path`
- Optional catch-all: `shop/[[...categories]]/page.tsx` → `/shop/:categories*`
- Route groups: `(marketing)/about/page.tsx` → `/about`
- Nested groups: `(auth)/(protected)/dashboard/page.tsx` → `/dashboard`

**Acceptance Criteria**:
- [ ] All test cases pass
- [ ] 100% test coverage on compiler functions
- [ ] Pure functions (no side effects)

---

### Phase 4: File Scanner

**Goal**: Discover route files from filesystem

**Tasks**:
1. `scanRoutes(routesDir: string): Promise<string[]>` - Find all route files
2. `getFileType(filename: string): FileType | null` - Classify file
3. `isRouteGroup(dirName: string): boolean` - Check for (group) pattern

**Files**:
- `packages/core/src/scanner.ts`
- `packages/core/src/__tests__/scanner.test.ts`

**Implementation**:
```typescript
import fg from 'fast-glob'

export async function scanRoutes(routesDir: string): Promise<string[]> {
  return fg([
    '**/page.tsx',
    '**/page.ts',
    '**/route.ts',
    '**/_layout.tsx',
    '**/middleware.ts'
  ], {
    cwd: routesDir,
    absolute: true,
    ignore: ['**/node_modules/**', '**/*.test.*', '**/*.spec.*', '**/_*/**']
  })
}
```

**Acceptance Criteria**:
- [ ] Finds all route file types
- [ ] Ignores node_modules and test files
- [ ] Returns absolute paths
- [ ] Works on macOS/Linux (Windows not required for spike)

---

### Phase 5: Layout & Middleware Resolver

**Goal**: Determine inheritance chains for each route

**Tasks**:
1. `resolveLayouts(route: CompiledRoute, allFiles: string[]): string[]` - Walk up tree
2. `resolveMiddleware(route: CompiledRoute, allFiles: string[]): string[]` - Walk up tree
3. Include route-level middleware from exports

**Files**:
- `packages/core/src/resolver.ts`
- `packages/core/src/__tests__/resolver.test.ts`

**Algorithm**:
```
For a route at /dashboard/settings/page.tsx:
1. Start at route directory
2. Walk up to routesDir root
3. Collect _layout.tsx files (root first)
4. Collect middleware.ts files (root first)
5. Return arrays in execution order
```

**Acceptance Criteria**:
- [ ] Layouts resolve in correct order (root → leaf)
- [ ] Middleware resolves in correct order
- [ ] Route groups don't break resolution

---

### Phase 6: Route Validator

**Goal**: Detect problems before runtime

**Tasks**:
1. `validateRoute(route: CompiledRoute): ValidationError[]` - Single route validation
2. `detectConflicts(routes: CompiledRoute[]): RouteConflict[]` - page + route conflicts
3. `validateManifest(manifest: RouteManifest): ValidationError[]` - Full validation

**Files**:
- `packages/core/src/validator.ts`

**Validations**:
- Duplicate parameter names in same path
- Catch-all not at end of path
- Invalid characters in segment names
- Content negotiation conflicts (page.tsx + route.ts)

**Acceptance Criteria**:
- [ ] Catches duplicate param names
- [ ] Catches invalid catch-all positions
- [ ] Reports content negotiation scenarios

---

### Phase 7: Manifest Builder

**Goal**: Combine all pieces into complete manifest

**Tasks**:
1. `buildRouteManifest(routesDir: string): Promise<RouteManifest>` - Main entry point
2. Integrate scanner, compiler, resolver, validator
3. Sort routes for Hono registration order

**Files**:
- `packages/core/src/compiler.ts` (add manifest builder)

**Flow**:
```typescript
export async function buildRouteManifest(routesDir: string): Promise<RouteManifest> {
  const files = await scanRoutes(routesDir)
  const routes = files
    .filter(f => isRouteFile(f))
    .map(f => compileRoute(f, routesDir))

  // Resolve layouts and middleware
  for (const route of routes) {
    route.layouts = resolveLayouts(route, files)
    route.middleware = resolveMiddleware(route, files)
  }

  // Validate and collect errors
  const errors = validateManifest({ routes, middleware: new Map(), layouts: new Map(), errors: [] })

  // Sort for Hono registration
  const sortedRoutes = sortRoutes(routes)

  return { routes: sortedRoutes, middleware: new Map(), layouts: new Map(), errors }
}
```

**Acceptance Criteria**:
- [ ] Produces complete manifest from directory
- [ ] Routes sorted correctly (static before dynamic)
- [ ] Errors collected but don't block output

---

### Phase 8: Config Loader

**Goal**: Load cloudwerk.config.ts

**Tasks**:
1. `loadConfig(configPath?: string): Promise<CloudwerkConfig>` - Load and parse config
2. `defineConfig(config: CloudwerkConfig): CloudwerkConfig` - Type helper
3. Handle missing config (use defaults)

**Files**:
- `packages/core/src/config.ts`

**Note**: For the spike, config loading can be minimal. Full implementation with esbuild transpilation can come later.

**Acceptance Criteria**:
- [ ] `defineConfig` provides type safety
- [ ] `loadConfig` returns defaults if no file exists
- [ ] Works with TypeScript config files

---

### Phase 9: Response Helpers

**Goal**: Re-export Hono + convenience helpers

**Tasks**:
1. Re-export Hono types (Context, MiddlewareHandler)
2. Create `json()`, `redirect()`, `html()`, `notFound()` helpers

**Files**:
- `packages/core/src/helpers.ts`

**Implementation**:
```typescript
export { Hono } from 'hono'
export type { Context, MiddlewareHandler } from 'hono'

export const json = <T>(data: T, init?: ResponseInit): Response =>
  Response.json(data, init)

export const redirect = (url: string, status = 302): Response =>
  Response.redirect(url, status)

export const html = (content: string, init?: ResponseInit): Response =>
  new Response(content, {
    ...init,
    headers: { 'content-type': 'text/html; charset=utf-8', ...init?.headers }
  })

export const notFound = (message = 'Not Found'): Response =>
  new Response(message, { status: 404 })
```

**Acceptance Criteria**:
- [ ] All helpers work correctly
- [ ] Types properly exported

---

### Phase 10: Package Exports & Documentation

**Goal**: Finalize public API

**Tasks**:
1. Complete `src/index.ts` with all exports
2. Verify package.json exports field
3. Build and verify output

**Files**:
- `packages/core/src/index.ts`
- `packages/core/package.json` (verify exports)

**Public API**:
```typescript
// Types
export type {
  RouteModule,
  CompiledRoute,
  RouteManifest,
  CloudwerkConfig,
  RouteConfig,
  HttpMethod
} from './types'

// Scanner & Compiler
export { scanRoutes, getFileType, isRouteGroup } from './scanner'
export {
  compileRoute,
  filePathToRoutePath,
  buildRouteManifest,
  sortRoutes
} from './compiler'
export { resolveLayouts, resolveMiddleware } from './resolver'
export { validateRoute, detectConflicts } from './validator'

// Config
export { loadConfig, defineConfig } from './config'

// Helpers
export { Hono, json, redirect, html, notFound } from './helpers'
export type { Context, MiddlewareHandler } from 'hono'
```

**Acceptance Criteria**:
- [ ] `pnpm --filter @cloudwerk/core build` produces dist/
- [ ] All exports accessible from package
- [ ] Types included in dist

---

## Testing Strategy

### Test Distribution

| Type | Coverage | Files |
|------|----------|-------|
| Unit | 70% | compiler.test.ts, scanner.test.ts, resolver.test.ts |
| Integration | 20% | manifest.test.ts |
| E2E | 10% | (Covered by Issue #11) |

### Coverage Target

- **Overall**: 85%+
- **compiler.ts**: 100% (critical path)
- **scanner.ts**: 90%+
- **resolver.ts**: 90%+

### Test Commands

```bash
pnpm --filter @cloudwerk/core test           # Run tests
pnpm --filter @cloudwerk/core test:coverage  # With coverage
```

---

## Risks & Mitigation

| Risk | Severity | Probability | Mitigation |
|------|----------|-------------|------------|
| Hono API changes | Medium | Low | Pin to ^4.0, add integration test |
| Windows path separators | Medium | Medium | Use path.posix for URL paths |
| Optional catch-all edge cases | Medium | Medium | Extensive test coverage |
| Config TS loading complexity | Low | Medium | Minimal impl for spike, enhance later |
| Large directory performance | Low | Low | fast-glob handles this well |

---

## Success Criteria

- [ ] All acceptance criteria in Issue #8 met
- [ ] `pnpm --filter @cloudwerk/core build` succeeds
- [ ] `pnpm --filter @cloudwerk/core test` passes with 85%+ coverage
- [ ] `buildRouteManifest()` correctly compiles test directory structure
- [ ] All RFC-002 route patterns supported
- [ ] No TypeScript errors
- [ ] Package exports all required functions and types

---

## Dependencies

### Upstream (Blocks This)
- None (can start immediately)

### Downstream (This Blocks)
- Issue #9: `@cloudwerk/cli` - needs manifest builder
- Issue #10: `create-cloudwerk-app` - needs working core
- Issue #11: E2E test - needs all packages

---

## Alternative Approaches Considered

### 1. Use globby instead of fast-glob

**Pros**: More features, better maintained
**Cons**: Larger bundle, more dependencies
**Decision**: fast-glob is sufficient and lighter

### 2. Use Node.js fs directly

**Pros**: No dependencies
**Cons**: More code, slower, manual ignore handling
**Decision**: fast-glob provides better DX

### 3. Generate Hono app directly in core

**Pros**: Single package for routing
**Cons**: Violates separation of concerns, makes CLI less flexible
**Decision**: Keep manifest output, let CLI handle Hono registration

---

## Next Steps

After approval, run:

```bash
/agency:implement .agency/plans/plan-8-file-based-route-compiler-20260126.md
```

Or implement manually following the phases above.

---

## References

- [RFC-002: Routing System](/docs/rfcs/002-routing-system.md)
- [GitHub Issue #8](https://github.com/squirrelsoft-dev/cloudwerk/issues/8)
- [Hono Documentation](https://hono.dev)
- [fast-glob Documentation](https://github.com/mrmlnc/fast-glob)
