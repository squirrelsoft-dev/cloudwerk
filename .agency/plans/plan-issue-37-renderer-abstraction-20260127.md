# Implementation Plan: Issue #37 - Core Renderer Abstraction Layer

**Date**: 2026-01-27
**Issue**: #37 - feat(ui): Core renderer abstraction layer
**Milestone**: v0.3.0 - Hono JSX Renderer
**Status**: Ready for Approval

---

## Summary

Create an abstraction layer that allows swapping between Hono JSX and React renderers without changing application code. The `@cloudwerk/ui` package acts as a facade, exporting `render()`, `html()`, and `hydrate()` functions that delegate to the configured renderer implementation.

---

## Related Issues

| Issue | Title | Relationship |
|-------|-------|--------------|
| **#32** | Page.tsx rendering | Depends on this - uses `render()` from `@cloudwerk/ui` |
| **#38** | Hono JSX SSR | Implements streaming SSR for hono-jsx renderer |
| **#39** | Hono JSX client hydration | Implements `hydrate()` for hono-jsx renderer |

**This issue blocks**: #32, #38, #39

---

## Scope

### In Scope
- `@cloudwerk/ui` package structure and build setup
- Renderer interface definition (`render`, `html`, `hydrate`)
- Hono JSX renderer implementation (default/primary)
- Config extension for `ui.renderer` option
- TypeScript types for JSX components
- Dynamic renderer loading based on config
- Unit tests for renderer abstraction

### Out of Scope (Deferred)
- React renderer implementation (future)
- Preact renderer implementation (future)
- Streaming SSR details (#38)
- Client hydration details (#39)
- `'use client'` directive parsing (#39)

---

## Technical Approach

### Architecture Overview

```
@cloudwerk/ui (facade)
        │
        ├── render(element) ───────┐
        ├── html(string) ──────────┤
        └── hydrate(element, root) ┘
                                   │
                                   ▼
                    ┌──────────────────────────┐
                    │   Renderer Selection     │
                    │   (from config)          │
                    └────────────┬─────────────┘
                                 │
            ┌────────────────────┼────────────────────┐
            ▼                    ▼                    ▼
    ┌───────────────┐   ┌───────────────┐   ┌───────────────┐
    │  hono-jsx     │   │    react      │   │   preact      │
    │  (default)    │   │   (future)    │   │   (future)    │
    └───────────────┘   └───────────────┘   └───────────────┘
```

### Package Structure

```
packages/ui/
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── src/
    ├── index.ts              # Main exports (facade)
    ├── types.ts              # Renderer interface + component types
    ├── renderer.ts           # Renderer factory + selection
    └── renderers/
        ├── index.ts          # Renderer registry
        ├── hono-jsx.ts       # Hono JSX implementation
        └── types.ts          # Shared renderer types
```

### Renderer Interface

```typescript
// packages/ui/src/types.ts

/**
 * Renderer implementation interface.
 * Each renderer (hono-jsx, react, preact) implements this.
 */
export interface Renderer {
  /**
   * Render a JSX element to an HTML Response.
   * Supports streaming for async components.
   */
  render(element: unknown, options?: RenderOptions): Response | Promise<Response>

  /**
   * Create an HTML Response from a raw string.
   * Useful for static HTML or templates.
   */
  html(content: string, options?: HtmlOptions): Response

  /**
   * Hydrate a JSX element on the client.
   * Only used for Client Components.
   */
  hydrate(element: unknown, root: Element): void
}

export interface RenderOptions {
  status?: number
  headers?: Record<string, string>
  doctype?: boolean
}

export interface HtmlOptions {
  status?: number
  headers?: Record<string, string>
}
```

### Config Extension

```typescript
// Addition to packages/core/src/types.ts

export interface CloudwerkConfig {
  // ... existing fields ...

  /**
   * UI renderer configuration.
   */
  ui?: UIConfig
}

export interface UIConfig {
  /**
   * Which renderer to use for JSX components.
   * @default 'hono-jsx'
   */
  renderer?: 'hono-jsx' | 'react' | 'preact'
}
```

### Hono JSX Renderer Implementation

```typescript
// packages/ui/src/renderers/hono-jsx.ts
import type { Renderer, RenderOptions, HtmlOptions } from '../types.js'

export const honoJsxRenderer: Renderer = {
  render(element: unknown, options: RenderOptions = {}): Response {
    const { status = 200, headers = {}, doctype = true } = options

    // Hono JSX elements have a toString() method
    const html = String(element)
    const body = doctype ? `<!DOCTYPE html>${html}` : html

    return new Response(body, {
      status,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        ...headers,
      },
    })
  },

  html(content: string, options: HtmlOptions = {}): Response {
    const { status = 200, headers = {} } = options

    return new Response(content, {
      status,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        ...headers,
      },
    })
  },

  hydrate(element: unknown, root: Element): void {
    // Placeholder - implemented in #39
    throw new Error('Client hydration not yet implemented. See issue #39.')
  },
}
```

### Facade Pattern

```typescript
// packages/ui/src/index.ts
import { getActiveRenderer } from './renderer.js'

export type { Renderer, RenderOptions, HtmlOptions } from './types.js'

/**
 * Render a JSX element to an HTML Response.
 *
 * @example
 * import { render } from '@cloudwerk/ui'
 *
 * app.get('/', (c) => {
 *   return render(<HomePage />)
 * })
 */
export function render(
  element: unknown,
  options?: RenderOptions
): Response | Promise<Response> {
  return getActiveRenderer().render(element, options)
}

/**
 * Create an HTML Response from a raw string.
 *
 * @example
 * import { html } from '@cloudwerk/ui'
 *
 * return html('<!DOCTYPE html><html>...</html>')
 */
export function html(content: string, options?: HtmlOptions): Response {
  return getActiveRenderer().html(content, options)
}

/**
 * Hydrate a JSX element on the client.
 * Only used for Client Components marked with 'use client'.
 *
 * @example
 * import { hydrate } from '@cloudwerk/ui'
 *
 * hydrate(<App />, document.getElementById('root'))
 */
export function hydrate(element: unknown, root: Element): void {
  return getActiveRenderer().hydrate(element, root)
}
```

### Renderer Selection

```typescript
// packages/ui/src/renderer.ts
import type { Renderer } from './types.js'
import { honoJsxRenderer } from './renderers/hono-jsx.js'

/**
 * Registry of available renderers.
 */
const renderers: Record<string, Renderer> = {
  'hono-jsx': honoJsxRenderer,
  // 'react': reactRenderer,     // Future
  // 'preact': preactRenderer,   // Future
}

/**
 * Currently active renderer.
 * Set during app initialization based on config.
 */
let activeRenderer: Renderer = honoJsxRenderer

/**
 * Get the currently active renderer.
 */
export function getActiveRenderer(): Renderer {
  return activeRenderer
}

/**
 * Set the active renderer by name.
 * Called during app initialization.
 *
 * @param name - Renderer name from config
 * @throws Error if renderer not found
 */
export function setActiveRenderer(name: string): void {
  const renderer = renderers[name]
  if (!renderer) {
    const available = Object.keys(renderers).join(', ')
    throw new Error(
      `Unknown renderer "${name}". Available renderers: ${available}`
    )
  }
  activeRenderer = renderer
}

/**
 * Register a custom renderer.
 * Allows third-party renderer implementations.
 */
export function registerRenderer(name: string, renderer: Renderer): void {
  renderers[name] = renderer
}
```

---

## File Changes

### New Files

| File | Purpose | Est. LOC |
|------|---------|----------|
| `packages/ui/src/index.ts` | Main exports (facade functions) | ~60 |
| `packages/ui/src/types.ts` | Renderer interface + types | ~50 |
| `packages/ui/src/renderer.ts` | Renderer factory + selection | ~60 |
| `packages/ui/src/renderers/index.ts` | Renderer registry exports | ~10 |
| `packages/ui/src/renderers/hono-jsx.ts` | Hono JSX implementation | ~80 |
| `packages/ui/src/renderers/types.ts` | Shared renderer types | ~20 |
| `packages/ui/tsconfig.json` | TypeScript config for Hono JSX | ~25 |
| `packages/ui/tsup.config.ts` | Build configuration | ~15 |
| `packages/ui/src/__tests__/render.test.ts` | Render function tests | ~150 |
| `packages/ui/src/__tests__/renderer.test.ts` | Renderer selection tests | ~100 |

### Modified Files

| File | Changes | Est. LOC |
|------|---------|----------|
| `packages/ui/package.json` | Add dependencies, exports, scripts | ~50 |
| `packages/core/src/types.ts` | Add `UIConfig` interface | ~15 |
| `packages/core/src/index.ts` | Export `UIConfig` type | ~2 |
| `packages/cli/src/server/createApp.ts` | Initialize renderer from config | ~10 |

**Total Estimated LOC**: ~647

---

## Implementation Phases

### Phase 1: Package Setup

**Objective**: Set up `@cloudwerk/ui` package structure and build

**Tasks**:
1. Update `packages/ui/package.json` with dependencies and exports
2. Create `packages/ui/tsconfig.json` for Hono JSX
3. Create `packages/ui/tsup.config.ts` for build
4. Verify package builds correctly

**Key Implementation - package.json**:
```json
{
  "name": "@cloudwerk/ui",
  "version": "0.1.0",
  "description": "UI rendering abstraction for Cloudwerk",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {},
  "peerDependencies": {
    "hono": "^4.0.0"
  },
  "devDependencies": {
    "@cloudwerk/core": "workspace:*",
    "hono": "^4.7.4",
    "tsup": "^8.0.0",
    "typescript": "^5.0.0",
    "vitest": "^2.0.0"
  }
}
```

**Key Implementation - tsconfig.json**:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "jsx": "react-jsx",
    "jsxImportSource": "hono/jsx"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

**Deliverables**:
- [ ] Package builds without errors
- [ ] TypeScript types generated correctly
- [ ] Can be imported from other packages

---

### Phase 2: Core Types & Interface

**Objective**: Define the renderer interface and types

**Tasks**:
1. Create `packages/ui/src/types.ts` with Renderer interface
2. Define `RenderOptions` and `HtmlOptions` types
3. Add JSX component type helpers
4. Export all types from index

**Key Implementation**:
```typescript
// packages/ui/src/types.ts

/**
 * Renderer implementation interface.
 */
export interface Renderer {
  render(element: unknown, options?: RenderOptions): Response | Promise<Response>
  html(content: string, options?: HtmlOptions): Response
  hydrate(element: unknown, root: Element): void
}

export interface RenderOptions {
  /** HTTP status code (default: 200) */
  status?: number
  /** Additional response headers */
  headers?: Record<string, string>
  /** Include <!DOCTYPE html> (default: true) */
  doctype?: boolean
}

export interface HtmlOptions {
  /** HTTP status code (default: 200) */
  status?: number
  /** Additional response headers */
  headers?: Record<string, string>
}

/**
 * Props for components that receive children.
 * Works with any JSX implementation.
 */
export interface PropsWithChildren<P = unknown> {
  children?: unknown
}
```

**Deliverables**:
- [ ] Renderer interface defined
- [ ] Options types defined
- [ ] Types exported correctly

---

### Phase 3: Hono JSX Renderer

**Objective**: Implement the default Hono JSX renderer

**Tasks**:
1. Create `packages/ui/src/renderers/hono-jsx.ts`
2. Implement `render()` function
3. Implement `html()` function
4. Add placeholder for `hydrate()` (implemented in #39)
5. Write unit tests

**Key Implementation**:
```typescript
// packages/ui/src/renderers/hono-jsx.ts
import type { Renderer, RenderOptions, HtmlOptions } from '../types.js'

/**
 * Hono JSX renderer implementation.
 *
 * Uses hono/jsx for server-side rendering.
 * Streaming support via renderToReadableStream will be added in #38.
 */
export const honoJsxRenderer: Renderer = {
  render(element: unknown, options: RenderOptions = {}): Response {
    const { status = 200, headers = {}, doctype = true } = options

    // Hono JSX elements implement toString() for rendering
    const htmlString = String(element)
    const body = doctype ? `<!DOCTYPE html>${htmlString}` : htmlString

    return new Response(body, {
      status,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        ...headers,
      },
    })
  },

  html(content: string, options: HtmlOptions = {}): Response {
    const { status = 200, headers = {} } = options

    return new Response(content, {
      status,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        ...headers,
      },
    })
  },

  hydrate(_element: unknown, _root: Element): void {
    // Client-side hydration - implemented in issue #39
    throw new Error(
      'Client hydration requires hono/jsx/dom. ' +
      'This feature will be available after issue #39 is implemented.'
    )
  },
}
```

**Deliverables**:
- [ ] `render()` converts JSX to HTML Response
- [ ] `html()` wraps raw HTML in Response
- [ ] `hydrate()` throws informative error (until #39)
- [ ] Unit tests pass

---

### Phase 4: Renderer Selection & Facade

**Objective**: Implement renderer selection and facade exports

**Tasks**:
1. Create `packages/ui/src/renderer.ts` with selection logic
2. Create `packages/ui/src/index.ts` with facade exports
3. Handle renderer registration
4. Write tests for renderer switching

**Key Implementation - renderer.ts**:
```typescript
// packages/ui/src/renderer.ts
import type { Renderer } from './types.js'
import { honoJsxRenderer } from './renderers/hono-jsx.js'

const renderers: Record<string, Renderer> = {
  'hono-jsx': honoJsxRenderer,
}

let activeRenderer: Renderer = honoJsxRenderer
let activeRendererName: string = 'hono-jsx'

export function getActiveRenderer(): Renderer {
  return activeRenderer
}

export function getActiveRendererName(): string {
  return activeRendererName
}

export function setActiveRenderer(name: string): void {
  const renderer = renderers[name]
  if (!renderer) {
    const available = Object.keys(renderers).join(', ')
    throw new Error(
      `Unknown renderer "${name}". Available: ${available}`
    )
  }
  activeRenderer = renderer
  activeRendererName = name
}

export function registerRenderer(name: string, renderer: Renderer): void {
  if (renderers[name]) {
    throw new Error(`Renderer "${name}" is already registered`)
  }
  renderers[name] = renderer
}

export function getAvailableRenderers(): string[] {
  return Object.keys(renderers)
}
```

**Key Implementation - index.ts**:
```typescript
// packages/ui/src/index.ts
import { getActiveRenderer } from './renderer.js'
import type { RenderOptions, HtmlOptions } from './types.js'

// Re-export types
export type { Renderer, RenderOptions, HtmlOptions, PropsWithChildren } from './types.js'

// Re-export renderer management
export {
  setActiveRenderer,
  getActiveRenderer,
  getActiveRendererName,
  registerRenderer,
  getAvailableRenderers,
} from './renderer.js'

/**
 * Render a JSX element to an HTML Response.
 */
export function render(
  element: unknown,
  options?: RenderOptions
): Response | Promise<Response> {
  return getActiveRenderer().render(element, options)
}

/**
 * Create an HTML Response from a raw string.
 */
export function html(content: string, options?: HtmlOptions): Response {
  return getActiveRenderer().html(content, options)
}

/**
 * Hydrate a JSX element on the client.
 */
export function hydrate(element: unknown, root: Element): void {
  return getActiveRenderer().hydrate(element, root)
}
```

**Deliverables**:
- [ ] `render()`, `html()`, `hydrate()` exported
- [ ] Renderer selection works
- [ ] Custom renderer registration works
- [ ] Tests pass

---

### Phase 5: Config Integration

**Objective**: Integrate with Cloudwerk config system

**Tasks**:
1. Add `UIConfig` to `@cloudwerk/core` types
2. Export type from core package
3. Initialize renderer in CLI `createApp()`
4. Validate renderer config

**Key Implementation - types.ts addition**:
```typescript
// Addition to packages/core/src/types.ts

/**
 * UI renderer configuration.
 */
export interface UIConfig {
  /**
   * Which renderer to use for JSX components.
   * @default 'hono-jsx'
   */
  renderer?: 'hono-jsx' | 'react' | 'preact'
}

// Update CloudwerkConfig
export interface CloudwerkConfig {
  // ... existing fields ...

  /**
   * UI renderer configuration.
   */
  ui?: UIConfig
}
```

**Key Implementation - CLI integration**:
```typescript
// Addition to packages/cli/src/server/createApp.ts
import { setActiveRenderer } from '@cloudwerk/ui'

export async function createApp(config: CloudwerkConfig): Promise<Hono> {
  // Initialize renderer from config
  const rendererName = config.ui?.renderer ?? 'hono-jsx'
  try {
    setActiveRenderer(rendererName)
  } catch (error) {
    throw new Error(
      `Failed to initialize UI renderer: ${error instanceof Error ? error.message : error}`
    )
  }

  // ... rest of app creation ...
}
```

**Deliverables**:
- [ ] `ui.renderer` config option works
- [ ] Renderer initialized at app startup
- [ ] Invalid renderer throws helpful error
- [ ] Default is 'hono-jsx'

---

### Phase 6: Testing

**Objective**: Comprehensive testing of renderer abstraction

**Tasks**:
1. Unit tests for render() function
2. Unit tests for html() function
3. Unit tests for renderer selection
4. Unit tests for custom renderer registration
5. Integration tests with config

**Test Cases**:
```typescript
describe('@cloudwerk/ui', () => {
  describe('render()', () => {
    it('converts JSX element to HTML Response', async () => {})
    it('includes doctype by default', async () => {})
    it('excludes doctype when disabled', async () => {})
    it('sets correct content-type header', async () => {})
    it('applies custom status code', async () => {})
    it('applies custom headers', async () => {})
  })

  describe('html()', () => {
    it('wraps raw HTML in Response', () => {})
    it('sets correct content-type header', () => {})
    it('applies custom status code', () => {})
    it('applies custom headers', () => {})
  })

  describe('hydrate()', () => {
    it('throws error until #39 is implemented', () => {})
  })

  describe('renderer selection', () => {
    it('uses hono-jsx by default', () => {})
    it('switches renderer via setActiveRenderer()', () => {})
    it('throws error for unknown renderer', () => {})
    it('allows custom renderer registration', () => {})
    it('prevents duplicate renderer registration', () => {})
  })

  describe('config integration', () => {
    it('initializes renderer from config', () => {})
    it('defaults to hono-jsx when not configured', () => {})
    it('throws on invalid renderer in config', () => {})
  })
})
```

**Deliverables**:
- [ ] All tests passing
- [ ] Coverage at 90%+
- [ ] Edge cases covered

---

## Testing Strategy

### Unit Tests (80%)
- `render()` function: HTML output, doctype, headers, status codes
- `html()` function: Response creation, headers
- Renderer selection: switching, registration, errors
- Type safety: TypeScript compilation

### Integration Tests (20%)
- Config loading and renderer initialization
- End-to-end render in Hono app
- Error handling during initialization

**Coverage Target**: 90%+ (core abstraction layer)

---

## Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| JSX type compatibility | High | Low | Use `unknown` type, proven in existing code |
| Renderer switching at runtime | Medium | Low | Single initialization at startup |
| Streaming complexity | Medium | Medium | Defer to #38, simple sync render first |
| React/Preact bundle size | Low | Low | Optional dependencies, tree-shaking |

---

## Success Criteria

- [ ] `@cloudwerk/ui` package builds and exports correctly
- [ ] `render()` converts JSX to HTML Response
- [ ] `html()` wraps raw HTML in Response
- [ ] `hydrate()` throws informative error (placeholder for #39)
- [ ] `ui.renderer` config option works
- [ ] Hono JSX is default renderer
- [ ] Custom renderers can be registered
- [ ] TypeScript types work correctly
- [ ] All tests pass with 90%+ coverage
- [ ] Documentation in code comments

---

## Dependencies

### NPM Packages (new)
- None required (hono is peer dependency)

### Peer Dependencies
- `hono`: ^4.0.0 - Required for hono/jsx

### Internal Dependencies
- `@cloudwerk/core` - Types and config

---

## Future Considerations

| Item | Issue |
|------|-------|
| React renderer | Future issue |
| Preact renderer | Future issue |
| Streaming SSR | #38 |
| Client hydration | #39 |
| Per-request renderer | Future (if needed) |

---

## Next Steps

After plan approval, run:
```bash
/agency:implement .agency/plans/plan-issue-37-renderer-abstraction-20260127.md
```

Then proceed with #32 (page.tsx rendering) which depends on this.

---

## Implementation Order (Full Roadmap)

```
#37 (this issue) → #32 (page.tsx) → #38 (streaming) → #33 (loaders) → #39 (hydration)
```
