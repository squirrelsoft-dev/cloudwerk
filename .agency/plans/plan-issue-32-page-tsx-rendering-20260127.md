# Implementation Plan: Issue #32 - Page.tsx Automatic Rendering and Layout Wrapping

**Date**: 2026-01-27
**Issue**: #32 - feat(core): Implement page.tsx automatic rendering and layout wrapping
**Milestone**: v0.2.0 - Page Components & Data Loading
**Reviewer**: Backend Architect Agent
**Status**: Ready for Approval

---

## Summary

Implement automatic handling of `page.tsx` files where the framework wraps the default export component in a `render()` call and applies layouts from the directory hierarchy. This enables developers to write components instead of route handlers for UI routes, with layouts automatically applied in the correct nesting order (root to leaf).

---

## Related Issues

This implementation integrates with the broader UI renderer architecture:

| Issue | Title | Relationship |
|-------|-------|--------------|
| **#37** | Core renderer abstraction layer | Provides `render()`, `html()`, `hydrate()` API |
| **#38** | Hono JSX SSR | Streaming SSR with `renderToReadableStream` |
| **#39** | Hono JSX client hydration | `'use client'` directive support |
| **#33** | Loaders | Passes loader data to page components (future) |

**Dependency**: This issue depends on #37 for the renderer abstraction. The implementation should use the `@cloudwerk/ui` facade rather than calling `hono/jsx` directly.

---

## Scope

### In Scope
- Page component loading and compilation via esbuild
- Layout component loading and compilation
- Layout nesting logic (inside-out wrapping, producing outside-in result)
- Integration with `@cloudwerk/ui` renderer abstraction (#37)
- Page route registration in CLI
- TypeScript types for page components
- Support for pages without layouts
- Route group handling for layouts
- Route config support for pages (same as route.ts)
- searchParams parsing utility
- Error handling for page rendering

### Out of Scope (Deferred to Future Issues)
- `loader()` for server-side data loading (#33)
- `action()` for form submissions
- `error.tsx` error boundaries
- `loading.tsx` streaming/suspense
- `not-found.tsx` 404 pages
- Client-side hydration (#39)
- `'use client'` directive parsing (#39)
- Hot module replacement (HMR)

---

## Technical Approach

### Architecture Overview

```
page.tsx request
      │
      ▼
┌─────────────────┐
│ registerRoutes  │ ─── detects fileType === 'page'
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│ loadPageModule  │────▶│  esbuild (TSX)  │
└────────┬────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐
│loadLayoutModules│ ─── load all layout files from route.layouts[]
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ createPageHandler│ ─── wraps page + layouts
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│  @cloudwerk/ui  │────▶│  render()       │ ─── from renderer abstraction (#37)
└────────┬────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐
│  Hono GET route │ ─── returns Response
└─────────────────┘
```

### Tech Stack (aligned with #37, #38)

- **Renderer Abstraction**: `@cloudwerk/ui` facade (from #37)
- **JSX Runtime**: `hono/jsx` (configured by renderer)
- **SSR**: `render()` from `@cloudwerk/ui` (wraps `renderToReadableStream`)
- **Build**: esbuild with automatic JSX transform
- **Module Loading**: Same pattern as `loadHandler.ts`

### Integration with Renderer Abstraction (#37)

Per issue #37, `@cloudwerk/ui` exports a unified API:

```typescript
import { render, html } from '@cloudwerk/ui'

// Server rendering (streaming)
const response = await render(<App />)

// HTML helper
const response = html('<h1>Hello</h1>')
```

The renderer implementation is selected via config:

```typescript
// cloudwerk.config.ts
export default defineConfig({
  ui: {
    renderer: 'hono-jsx', // 'hono-jsx' | 'react'
  },
})
```

### Data Flow

1. Request arrives at page route (e.g., `/dashboard`)
2. Hono routes to registered page handler
3. Handler builds `PageProps` from request (params, searchParams)
4. Handler renders page component with props
5. Handler wraps page in layouts (inside-out, producing root → leaf nesting)
6. Handler calls `render()` from `@cloudwerk/ui` which returns streaming Response

### Layout Wrapping Order

Given layouts array: `[root, dashboard, settings]` (root-to-leaf order from resolver)

Wrapping process (reversed for inside-out wrapping):
1. Wrap page with `settings` layout
2. Wrap (page + settings) with `dashboard` layout
3. Wrap ((page + settings) + dashboard) with `root` layout

Result: `<Root><Dashboard><Settings><Page/></Settings></Dashboard></Root>`

---

## File Changes

### New Files

| File | Purpose | Est. LOC |
|------|---------|----------|
| `packages/cli/src/server/loadPage.ts` | Page component loader (esbuild) | ~120 |
| `packages/cli/src/server/loadLayout.ts` | Layout component loader (esbuild) | ~100 |
| `packages/cli/src/server/parseSearchParams.ts` | Query string to searchParams parser | ~40 |
| `packages/cli/src/server/__tests__/registerRoutes.page.test.ts` | Page registration tests | ~250 |
| `packages/cli/src/server/__tests__/parseSearchParams.test.ts` | searchParams parsing tests | ~80 |
| `packages/cli/__fixtures__/with-pages/app/page.tsx` | Test fixture: root page | ~15 |
| `packages/cli/__fixtures__/with-pages/app/layout.tsx` | Test fixture: root layout | ~20 |
| `packages/cli/__fixtures__/with-pages/app/dashboard/page.tsx` | Test fixture: nested page | ~15 |
| `packages/cli/__fixtures__/with-pages/app/dashboard/layout.tsx` | Test fixture: nested layout | ~20 |
| `packages/cli/__fixtures__/with-pages/app/users/[id]/page.tsx` | Test fixture: dynamic page | ~15 |

### Modified Files

| File | Changes | Est. LOC |
|------|---------|----------|
| `packages/cli/src/server/registerRoutes.ts` | Add page file handling branch with error handling | ~80 |
| `packages/cli/src/types.ts` | Add `LoadedPageModule`, `LoadedLayoutModule` types | ~25 |
| `packages/cli/package.json` | Add `@cloudwerk/ui` dependency | ~5 |

**Note**: The `@cloudwerk/ui` package implementation is covered by issue #37. This plan assumes #37 is implemented first or in parallel.

**Total Estimated LOC**: ~785

---

## Implementation Phases

### Phase 1: Component Loaders

**Objective**: Create loaders for page and layout components

**Tasks**:
1. Create `loadPage.ts` following `loadHandler.ts` pattern
2. Create `loadLayout.ts` for layout component loading
3. Add `LoadedPageModule` and `LoadedLayoutModule` types to CLI
4. Configure esbuild for Hono JSX (automatic mode)
5. Add module caching with mtime invalidation
6. Handle temp file cleanup

**Key Implementation - Page Loader**:
```typescript
// packages/cli/src/server/loadPage.ts
import * as fs from 'node:fs'
import * as path from 'node:path'
import { builtinModules } from 'node:module'
import { build } from 'esbuild'
import { pathToFileURL } from 'node:url'
import { validateRouteConfig } from '@cloudwerk/core'
import type { PageComponent, RouteConfig } from '@cloudwerk/core'

export interface LoadedPageModule {
  default: PageComponent
  config?: RouteConfig
}

const pageModuleCache = new Map<string, { module: LoadedPageModule; mtime: number }>()

export async function loadPageModule(
  absolutePath: string,
  verbose: boolean = false
): Promise<LoadedPageModule> {
  // Check cache first (same pattern as loadHandler.ts)
  const stat = fs.statSync(absolutePath)
  const mtime = stat.mtimeMs
  const cached = pageModuleCache.get(absolutePath)
  if (cached && cached.mtime === mtime) {
    return cached.module
  }

  const nodeVersion = process.versions.node.split('.')[0]
  const target = `node${nodeVersion}`

  const result = await build({
    entryPoints: [absolutePath],
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'node',
    target,
    jsx: 'automatic',
    jsxImportSource: 'hono/jsx',
    external: [
      '@cloudwerk/core',
      '@cloudwerk/ui',
      'hono',
      'hono/jsx',
      'hono/jsx/dom',
      'hono/jsx/streaming',
      'hono/html',
      ...builtinModules,
      ...builtinModules.map((m) => `node:${m}`),
    ],
    logLevel: verbose ? 'warning' : 'silent',
    sourcemap: 'inline',
  })

  // ... temp file write, import, cleanup (same as loadHandler.ts)
  // ... validate config if present
  // ... cache and return module
}
```

**Deliverables**:
- [ ] `loadPageModule()` function working
- [ ] `loadLayoutModule()` function working
- [ ] JSX compilation working with Hono JSX
- [ ] Module caching working

---

### Phase 2: Utilities

**Objective**: Create utility functions for page handling

**Tasks**:
1. Create `parseSearchParams.ts` utility
2. Write tests for searchParams parsing

**Key Implementation**:
```typescript
// packages/cli/src/server/parseSearchParams.ts
import type { Context } from 'hono'

/**
 * Parse search params from request URL.
 * Handles multiple values for the same key.
 *
 * @example
 * // /page?tags=a&tags=b&page=1
 * // Returns: { tags: ['a', 'b'], page: '1' }
 */
export function parseSearchParams(
  c: Context
): Record<string, string | string[] | undefined> {
  const result: Record<string, string | string[] | undefined> = {}
  const url = new URL(c.req.url)

  for (const [key, value] of url.searchParams.entries()) {
    const existing = result[key]
    if (existing !== undefined) {
      result[key] = Array.isArray(existing)
        ? [...existing, value]
        : [existing, value]
    } else {
      result[key] = value
    }
  }

  return result
}
```

**Deliverables**:
- [ ] `parseSearchParams()` function working
- [ ] All edge cases tested

---

### Phase 3: Page Route Registration

**Objective**: Register page routes with layout wrapping and error handling

**Tasks**:
1. Add page handling branch in `registerRoutes.ts`
2. Implement page handler creation with layout nesting
3. Build `PageProps` from request (params, searchParams)
4. Apply middleware before page handler
5. Apply route config for pages (same as route.ts)
6. Handle async page/layout components
7. Add error handling with fallback response
8. Handle pages with no layouts gracefully
9. Integrate with `@cloudwerk/ui` render function

**Key Implementation**:
```typescript
// In registerRoutes.ts - page handling branch
import { loadPageModule } from './loadPage.js'
import { loadLayoutModule } from './loadLayout.js'
import { parseSearchParams } from './parseSearchParams.js'
import { render } from '@cloudwerk/ui'
import type { PageProps } from '@cloudwerk/core'

// ... inside registerRoutes function ...

if (route.fileType === 'page') {
  try {
    // Load page component
    const pageModule = await loadPageModule(route.absolutePath, verbose)
    const PageComponent = pageModule.default

    // Load all layout components (already in correct order: root → closest)
    const layoutModules = await Promise.all(
      route.layouts.map(layoutPath => loadLayoutModule(layoutPath, verbose))
    )
    const layouts = layoutModules.map(m => m.default)

    // Apply middleware first (same as route.ts)
    for (const middlewarePath of route.middleware) {
      const middlewareHandler = await loadMiddlewareModule(middlewarePath, verbose)
      if (middlewareHandler) {
        app.use(route.urlPattern, middlewareHandler)
      }
    }

    // Apply config middleware if page exports config
    if (pageModule.config) {
      app.use(route.urlPattern, createConfigMiddleware(pageModule.config))
      if (verbose) {
        logger.info(`Applied page config: ${route.filePath} -> ${route.urlPattern}`)
      }
    }

    // Register page handler
    app.get(route.urlPattern, async (c) => {
      try {
        const params = c.req.param()
        const searchParams = parseSearchParams(c)

        // Build page props
        const pageProps: PageProps = { params, searchParams }

        // Render page component (handle async - all components are Server Components)
        let element = await Promise.resolve(PageComponent(pageProps))

        // Wrap with layouts (reverse to wrap inside-out)
        // This produces the correct nesting: Root > Dashboard > Page
        for (const Layout of [...layouts].reverse()) {
          element = await Promise.resolve(
            Layout({ children: element, params })
          )
        }

        // Use @cloudwerk/ui render function (streaming SSR per #38)
        return render(element)
      } catch (error) {
        // Log error for debugging
        const message = error instanceof Error ? error.message : String(error)
        logger.error(`Error rendering page ${route.filePath}: ${message}`)

        // Return error response (future: error.tsx boundary)
        return c.html(
          `<!DOCTYPE html><html><body><h1>Internal Server Error</h1></body></html>`,
          500
        )
      }
    })

    registeredRoutes.push({
      method: 'GET',
      pattern: route.urlPattern,
      filePath: route.filePath,
    })

    logger.debug(`Registered page ${route.urlPattern}`)

  } catch (error) {
    // Log error but continue with other routes
    const message = error instanceof Error ? error.message : String(error)
    logger.error(`Failed to load page ${route.filePath}: ${message}`)
  }
}
```

**Deliverables**:
- [ ] Page routes registered correctly
- [ ] Layouts applied in correct order (root wraps all)
- [ ] Props passed correctly to components
- [ ] Middleware applied to page routes
- [ ] Route config works for pages
- [ ] Async components handled (Server Components)
- [ ] Error handling in place

---

### Phase 4: Testing & Edge Cases

**Objective**: Comprehensive testing and edge case handling

**Tasks**:
1. Write integration tests for page registration
2. Test layout nesting order (verify root → leaf wrapping)
3. Test pages without layouts
4. Test pages with route groups
5. Test pages with dynamic parameters
6. Test searchParams parsing (single, multiple, empty values)
7. Test async page components
8. Test error handling
9. Test route config for pages
10. Add test fixtures

**Test Fixtures**:
```tsx
// packages/cli/__fixtures__/with-pages/app/page.tsx
// Server Component (default - no 'use client' directive)
export default function HomePage() {
  return (
    <div>
      <h1>Home Page</h1>
    </div>
  )
}

// packages/cli/__fixtures__/with-pages/app/layout.tsx
export default function RootLayout({ children }: { children: unknown }) {
  return (
    <html>
      <head><title>Test App</title></head>
      <body>{children}</body>
    </html>
  )
}

// packages/cli/__fixtures__/with-pages/app/users/[id]/page.tsx
import type { PageProps } from '@cloudwerk/core'

// Server Component with typed params
export default function UserPage({ params, searchParams }: PageProps<{ id: string }>) {
  return (
    <div>
      <h1>User: {params.id}</h1>
      {searchParams.tab && <p>Tab: {searchParams.tab}</p>}
    </div>
  )
}
```

**Test Cases**:
```typescript
describe('Page Registration', () => {
  describe('basic functionality', () => {
    it('registers page.tsx as GET route', async () => {})
    it('renders page without layouts when none exist', async () => {})
    it('returns HTML response with correct content-type', async () => {})
  })

  describe('layout nesting', () => {
    it('applies layouts in correct order (root wraps all)', async () => {})
    it('passes params to both page and layouts', async () => {})
    it('handles deeply nested layouts (3+ levels)', async () => {})
  })

  describe('props', () => {
    it('passes params from dynamic segments to page', async () => {})
    it('parses single searchParams correctly', async () => {})
    it('parses multiple searchParams with same key as array', async () => {})
    it('handles empty searchParams', async () => {})
  })

  describe('async components', () => {
    it('awaits async page component (Server Component)', async () => {})
    it('awaits async layout component', async () => {})
  })

  describe('middleware and config', () => {
    it('applies middleware before page handler', async () => {})
    it('applies route config from page exports', async () => {})
  })

  describe('error handling', () => {
    it('returns 500 when page component throws', async () => {})
    it('returns 500 when layout component throws', async () => {})
    it('logs error details for debugging', async () => {})
    it('continues loading other routes after error', async () => {})
  })

  describe('edge cases', () => {
    it('handles route group layouts', async () => {})
    it('handles pages with catch-all segments', async () => {})
    it('handles pages with optional catch-all segments', async () => {})
  })
})

describe('parseSearchParams', () => {
  it('parses single value params', () => {})
  it('parses multiple values as array', () => {})
  it('handles empty query string', () => {})
  it('handles params with empty values', () => {})
  it('preserves param order', () => {})
})
```

**Deliverables**:
- [ ] All tests passing
- [ ] Edge cases covered
- [ ] Test fixtures in place
- [ ] Coverage at 80%+

---

## Testing Strategy

### Unit Tests (70%)
- `loadPageModule()`: Compilation, caching, error handling, JSX transform
- `loadLayoutModule()`: Compilation, caching, error handling
- `parseSearchParams()`: Query string parsing edge cases

### Integration Tests (20%)
- Page registration end-to-end
- Layout nesting order verification (multi-level)
- Middleware application to pages
- Route config application to pages
- Route group handling

### E2E Tests (10%)
- Full request cycle: request → render → response
- Layout hierarchy with 3+ levels
- Dynamic route parameters in pages
- Error scenarios and recovery

**Coverage Target**: 80%+

---

## Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| #37 not ready | High | Medium | Can stub `render()` for testing; implement in parallel |
| JSX compilation overhead | Medium | Medium | Module caching prevents recompilation |
| Layout nesting order bugs | High | Low | Extensive tests with multi-level fixtures |
| Memory usage with many pages | Medium | Low | Same caching pattern as handlers |
| TypeScript JSX config conflicts | Medium | Medium | Isolated esbuild config overrides |
| Async component complexity | Medium | Medium | All Server Components; clear await pattern |
| Error handling gaps | High | Low | Comprehensive try-catch; future error.tsx |

---

## Success Criteria

- [ ] `page.tsx` with default export becomes a GET route
- [ ] Layouts are automatically applied in correct order (root wraps all, leaf closest to page)
- [ ] Pages without layouts render without wrapping
- [ ] TypeScript provides proper typing for page props (`PageProps<TParams>`)
- [ ] Middleware applies to page routes (same as route.ts)
- [ ] Route config works with pages (auth, rateLimit, cache)
- [ ] searchParams correctly parsed (including multiple values)
- [ ] Async page and layout components work correctly (Server Components)
- [ ] Errors are caught and return 500 response
- [ ] All existing tests pass
- [ ] New test coverage at 80%+
- [ ] Integrates with `@cloudwerk/ui` render function (#37)

---

## Dependencies

### Required Issues (implement first or in parallel)
- **#37**: Core renderer abstraction layer - provides `render()` function

### NPM Packages
- `@cloudwerk/ui`: workspace:* - Internal UI package (from #37)

### Internal Dependencies
- `@cloudwerk/core` - Types (PageProps, LayoutProps, RouteConfig)
- Existing `loadHandler.ts` pattern for module loading
- Existing `resolver.ts` for layout resolution (already working)

---

## Future Considerations

These items are explicitly deferred and will be addressed in future issues:

| Item | Issue |
|------|-------|
| `loader()` function | #33 |
| `action()` function | TBD |
| `error.tsx` boundaries | TBD |
| `loading.tsx` / Suspense streaming | #38 |
| `not-found.tsx` pages | TBD |
| Client hydration (`'use client'`) | #39 |
| HMR | TBD |

---

## Implementation Order

Recommended implementation sequence considering dependencies:

1. **#37** - Core renderer abstraction layer (or stub for testing)
2. **#32** - Page.tsx rendering (this issue)
3. **#38** - Hono JSX SSR with streaming
4. **#33** - Loaders
5. **#39** - Client hydration

If #37 is not ready, this issue can be implemented with a simple stub:

```typescript
// Temporary stub until #37 is implemented
export async function render(element: unknown): Promise<Response> {
  const html = element.toString()
  return new Response(`<!DOCTYPE html>${html}`, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  })
}
```

---

## Next Steps

After plan approval, run:
```bash
/agency:implement .agency/plans/plan-issue-32-page-tsx-rendering-20260127.md
```

Or modify the plan:
- Adjust scope or approach
- Add/remove phases
- Change testing strategy

---

## Revision History

| Date | Change |
|------|--------|
| 2026-01-27 | Initial plan with Preact |
| 2026-01-27 | Updated to use Hono JSX |
| 2026-01-27 | Aligned with #37, #38, #39 renderer architecture |
