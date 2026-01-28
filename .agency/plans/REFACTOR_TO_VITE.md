# Cloudwerk Refactor: Replace Custom Build Pipeline with Vite Ecosystem

## Status: COMPLETED

**Completion Date**: 2026-01-28

The migration from custom esbuild pipeline to Vite has been completed. This document now serves as architectural documentation.

---

## Architecture Overview

### @cloudwerk/vite-plugin

A new package (`packages/vite-plugin/`) provides the core integration between Cloudwerk's file-based routing and Vite:

**Virtual Modules**:
- `virtual:cloudwerk/server-entry` - Full Hono app with all routes registered
- `virtual:cloudwerk/client-entry` - Hydration bootstrap for client components
- `virtual:cloudwerk/manifest` - JSON route manifest for debugging

**Key Features**:
- Uses `@cloudwerk/core` scanner to discover routes
- Generates virtual modules dynamically (no explicit server.ts/client.ts needed)
- HMR support via Vite module invalidation when route files change
- Optional customization: detects if user provides `app/server.ts`

### Package Structure

```
packages/vite-plugin/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts           # Main plugin export
│   ├── plugin.ts          # Core Vite plugin implementation
│   ├── types.ts           # Plugin option types
│   └── virtual-modules/
│       ├── server-entry.ts   # Generates virtual:cloudwerk/server-entry
│       └── client-entry.ts   # Generates virtual:cloudwerk/client-entry
```

### CLI Commands

**`cloudwerk dev`** - Uses Vite's `createServer()` with:
- `@cloudwerk/vite-plugin` for route discovery and virtual modules
- `@hono/vite-dev-server` for Hono integration

**`cloudwerk build`** - Uses Vite's `build()` API with:
- Client assets build (for hydration)
- Server bundle via `@hono/vite-build/cloudflare-workers`

---

## Files Deleted

### packages/cli/src/server/ (Module Loading)
```
loadPage.ts              ✓ Deleted - Vite handles module loading
loadLayout.ts            ✓ Deleted - Vite handles module loading
loadHandler.ts           ✓ Deleted - Vite handles module loading
loadMiddleware.ts        ✓ Deleted - Vite handles module loading
loadErrorBoundary.ts     ✓ Deleted - Vite handles module loading
loadNotFound.ts          ✓ Deleted - Vite handles module loading
loadLoading.ts           ✓ Deleted - Vite handles module loading
loadClientComponent.ts   ✓ Deleted - Vite handles client bundling
clientBundle.ts          ✓ Deleted - Vite handles client bundling
clientComponentPlugin.ts ✓ Deleted - Vite handles client detection
hydrationManifest.ts     ✓ Deleted - Plugin tracks client components
hydrationRoutes.ts       ✓ Deleted - Vite serves client bundles
registerRoutes.ts        ✓ Deleted - Virtual module generates registrations
createApp.ts             ✓ Deleted - Virtual module creates Hono app
ssg.ts                   ✓ Deleted - To be reimplemented with Vite later
```

### packages/cli/src/build/ (Production Bundling)
```
bundleServer.ts          ✓ Deleted - @hono/vite-build handles this
bundleClientAssets.ts    ✓ Deleted - Vite handles client bundling
generateWorkerEntry.ts   ✓ Deleted - Plugin generates virtual entry
writeManifest.ts         ✓ Deleted - Vite generates build info
index.ts                 ✓ Deleted - No longer needed
```

---

## Files Kept

### packages/core/src/ (All Kept)
```
scanner.ts               ✓ Kept - File-based route discovery
compiler.ts              ✓ Kept - Path → URL pattern conversion
resolver.ts              ✓ Kept - Layout/middleware resolution
config.ts                ✓ Kept - Config loading
types.ts                 ✓ Kept - Type definitions
helpers.ts               ✓ Kept - Response helpers
client.ts                ✓ Kept - 'use client' detection
validator.ts             ✓ Kept - Route validation
boundary-validator.ts    ✓ Kept - Boundary validation
```

### packages/cli/src/server/ (Utilities)
```
parseSearchParams.ts     ✓ Kept - Utility function
```

### packages/ui/src/ (All Kept)
```
renderer.ts              ✓ Kept - Renderer abstraction
renderers/               ✓ Kept - Hono JSX and React renderers
types.ts                 ✓ Kept - Type definitions
hydration.ts             ✓ Kept - Hydration utilities
```

---

## Dependencies

### Added to packages/cli/package.json
```json
{
  "dependencies": {
    "@cloudwerk/vite-plugin": "workspace:^",
    "@hono/vite-build": "^1.3.0",
    "@hono/vite-dev-server": "^0.18.0",
    "vite": "^6.0.0"
  }
}
```

### Kept (for now)
```json
{
  "dependencies": {
    "@hono/node-server": "^1.13.0",  // Kept for backwards compatibility
    "esbuild": "^0.25.0"             // Vite uses internally anyway
  }
}
```

---

## Usage

### For End Users

Users don't need to create any entry files. The CLI handles everything:

```bash
# Development with HMR
cloudwerk dev

# Production build
cloudwerk build
```

### Optional Customization

If users want to customize the server entry, they can create `app/server.ts`:

```typescript
import { Hono } from 'hono'

const app = new Hono()

// Custom middleware or routes
app.use('*', async (c, next) => {
  console.log('Custom middleware')
  await next()
})

// Routes are automatically registered from app/routes/
export default app
```

The plugin will detect this file and use it instead of generating a virtual entry.

---

## Virtual Module Generation

### Server Entry (virtual:cloudwerk/server-entry)

Generated code structure:
```typescript
import { Hono } from 'hono'
import { contextMiddleware, createHandlerAdapter, setRouteConfig } from '@cloudwerk/core'
import { renderToStream, setActiveRenderer } from '@cloudwerk/ui'

// Auto-generated imports
import * as page_0 from '/app/routes/page.tsx'
import * as route_0 from '/app/routes/api/users/route.ts'
import * as layout_0 from '/app/routes/layout.tsx'
import middleware_0 from '/app/routes/middleware.ts'

// Initialize renderer
setActiveRenderer('hono-jsx')

// Create Hono app
const app = new Hono({ strict: false })
app.use('*', contextMiddleware())

// Auto-generated route registrations
registerPage(app, '/', page_0, [layout_0], [middleware_0])
registerRoute(app, '/api/users', route_0, [middleware_0])

// Error handlers
app.notFound((c) => c.json({ error: 'Not Found' }, 404))
app.onError((err, c) => c.json({ error: err.message }, 500))

export default app
```

### Client Entry (virtual:cloudwerk/client-entry)

Generated hydration bootstrap:
```typescript
import { render } from 'hono/jsx/dom'

const bundles = {
  'components_Counter': '/__cloudwerk/components_Counter.js'
}

async function hydrate() {
  const elements = document.querySelectorAll('[data-hydrate-id]')
  for (const el of elements) {
    const componentId = el.getAttribute('data-hydrate-id')
    const props = JSON.parse(el.getAttribute('data-hydrate-props') || '{}')
    const module = await import(bundles[componentId])
    render(module.default(props), el)
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', hydrate)
} else {
  hydrate()
}
```

---

## Benefits Achieved

1. **HMR**: Instant updates without server restart
2. **Zero Config**: No explicit entry files required
3. **Smaller Codebase**: ~3000 lines of custom bundling code removed
4. **Better DX**: Vite's error overlay, fast refresh
5. **Code Splitting**: Vite handles shared vendor chunks automatically
6. **No Memory Leaks**: Vite manages module caching properly
7. **Ecosystem Compatibility**: Works with all Vite plugins

---

## Future Work

- [ ] Re-implement SSG (Static Site Generation) with Vite
- [ ] Add Tailwind CSS integration example
- [ ] Improve HMR to be more granular (partial page reloads)
- [ ] Add source map support for better debugging
- [ ] Consider removing `@hono/node-server` and `esbuild` from dependencies

---

## References

- [@hono/vite-dev-server](https://github.com/honojs/vite-plugins/tree/main/packages/dev-server)
- [@hono/vite-build](https://github.com/honojs/vite-plugins/tree/main/packages/build)
- [Vite Plugin API](https://vite.dev/guide/api-plugin)
- [Vite SSR Guide](https://vite.dev/guide/ssr)
- [hono/jsx/dom](https://hono.dev/docs/guides/jsx-dom) - Client-side rendering
