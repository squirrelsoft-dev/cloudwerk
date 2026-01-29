# Plan: Static Assets Support (public/ folder)

## Overview

Implement Next.js-style static asset serving from a `public/` directory. Files in `public/` should be:
- Served at the root URL path (e.g., `public/favicon.ico` → `/favicon.ico`)
- Copied to build output for production deployment
- Served with appropriate caching headers
- Available during development without build step

## Current State

### What Exists
- Documentation mentions `publicDir` config option (default: 'public')
- `apps/docs/src/content/docs/reference/cloudwerk-config.mdx` documents the option
- `apps/docs/src/content/docs/api/configuration.mdx` documents the option

### What's Missing
- `publicDir` is NOT defined in `CloudwerkConfig` type
- No static file serving in the Vite plugin
- No static file handling in generated server entry
- No templates include a `public/` folder
- No build step copies public assets to output

## Implementation Plan

### Step 1: Add `publicDir` to Configuration

**File:** `packages/core/src/types.ts`

Add `publicDir` to `CloudwerkConfig`:

```typescript
export interface CloudwerkConfig {
  /** Directory containing application files (default: "app") */
  appDir: string

  /** Directory containing route files (default: "app") */
  routesDir: string

  /** Directory for static assets served at root (default: "public") */
  publicDir: string

  // ... existing fields
}
```

**File:** `packages/core/src/config.ts`

Add default value:

```typescript
export const DEFAULT_CONFIG: CloudwerkConfig = {
  appDir: 'app',
  routesDir: 'app',
  publicDir: 'public',  // Add this
  extensions: ['.ts', '.tsx'] as SupportedExtension[],
  strict: true,
  basePath: '/',
  debug: false,
}
```

Update `mergeConfig`:

```typescript
export function mergeConfig(
  defaults: CloudwerkConfig,
  user: CloudwerkUserConfig
): CloudwerkConfig {
  return {
    appDir: user.appDir ?? defaults.appDir,
    routesDir: user.routesDir ?? defaults.routesDir,
    publicDir: user.publicDir ?? defaults.publicDir,  // Add this
    // ... rest
  }
}
```

### Step 2: Configure Vite's Static Asset Serving (Dev)

**File:** `packages/vite-plugin/src/plugin.ts`

Vite has built-in support for serving static assets from `publicDir`. We need to ensure the Cloudwerk plugin works with Vite's configuration.

Add to the plugin's `config` hook:

```typescript
export function cloudwerkPlugin(options: CloudwerkVitePluginOptions = {}): Plugin {
  return {
    name: 'cloudwerk',

    // Add config hook to set Vite's publicDir
    config(userConfig, { mode }) {
      // Let Cloudwerk config drive Vite's publicDir
      // This will be resolved in configResolved
      return {
        // Don't override if user explicitly set it in vite.config.ts
        publicDir: userConfig.publicDir ?? 'public',
      }
    },

    // ... existing hooks
  }
}
```

However, there's a complication: Vite's dev server serves static files, but `@hono/vite-dev-server` handles all requests through Hono. We need to ensure static files are served before Hono routes.

**Option A: Let Vite handle static files (preferred for dev)**

Vite automatically serves files from `publicDir` at the root. The issue is that `@hono/vite-dev-server` might intercept these requests. We need to ensure the middleware order is correct.

**Option B: Serve static files through Hono**

Add static file serving to the generated server entry:

```typescript
// In generated server entry
import { serveStatic } from 'hono/serve-static'

// Serve static files from public directory
app.use('/*', serveStatic({ root: './public' }))
```

This approach works but has caveats:
- Needs different handling for dev vs production
- In dev, files are on filesystem; in production, they may be in Workers KV or bundled

### Step 3: Add Static File Middleware to Server Entry

**File:** `packages/vite-plugin/src/virtual-modules/server-entry.ts`

For development, we can use Hono's `serveStatic` middleware. The key is detecting whether a request is for a static file before route matching.

```typescript
export function generateServerEntry(
  manifest: RouteManifest,
  scanResult: ScanResult,
  options: ResolvedCloudwerkOptions
): string {
  // ... existing code

  return `/**
 * Generated Cloudwerk Server Entry
 */

import { Hono } from 'hono'
import { serveStatic } from '@hono/node-server/serve-static'
// ... other imports

const app = new Hono({ strict: false })

// Serve static files from public directory (before route handlers)
// In dev mode, this serves files from the filesystem
// In production, this would be replaced with appropriate adapter
app.use('/*', serveStatic({
  root: './${options.publicDir}',
  // Only serve if file exists, otherwise continue to routes
  onNotFound: (_path, c) => {
    // Don't serve 404 for missing static files, let routes handle it
  }
}))

// ... rest of generated code
`
}
```

However, there's a challenge: `@hono/node-server/serve-static` is for Node.js, but Cloudwerk targets Cloudflare Workers. We need platform-specific handling.

### Step 4: Platform-Specific Static File Serving

For Cloudflare Workers, static assets should use:
- **Workers Sites / Workers Assets** (Cloudflare's asset serving)
- Or serve from KV storage

For local development with `@hono/vite-dev-server`:
- Use Vite's built-in static file serving
- Or use node-server's `serveStatic`

**Recommended approach:**

1. **Dev mode**: Let Vite handle static files (configure Vite's `publicDir`)
2. **Production**: Generate manifest of public assets for Cloudflare Workers

### Step 5: Update Vite Plugin to Configure Static Assets

**File:** `packages/vite-plugin/src/plugin.ts`

```typescript
export function cloudwerkPlugin(options: CloudwerkVitePluginOptions = {}): Plugin {
  let publicDir: string = 'public'

  return {
    name: 'cloudwerk',

    config(userConfig) {
      // Pass through to Vite's publicDir config
      // This ensures Vite's dev server serves static files
      return {
        publicDir: options.publicDir ?? userConfig.publicDir ?? 'public',
      }
    },

    async configResolved(config: ResolvedConfig) {
      publicDir = config.publicDir
      // ... existing initialization
    },

    // ... rest of plugin
  }
}
```

### Step 6: Handle Static Files in @hono/vite-dev-server

The `@hono/vite-dev-server` middleware runs before Vite's static file serving. We need to ensure requests for static files pass through to Vite.

**File:** `packages/vite-plugin/src/virtual-modules/server-entry.ts`

Add early return for static file requests:

```typescript
// In the generated server entry, before route registration
app.use('*', async (c, next) => {
  const path = c.req.path

  // Skip routing for common static file extensions
  // Let Vite's dev server handle these
  const staticExtensions = [
    '.ico', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp',
    '.woff', '.woff2', '.ttf', '.eot',
    '.css', '.js', '.mjs', '.map',
    '.json', '.xml', '.txt', '.pdf',
    '.mp3', '.mp4', '.webm', '.ogg',
  ]

  if (staticExtensions.some(ext => path.endsWith(ext))) {
    // Return undefined to pass to next middleware/Vite
    return undefined
  }

  await next()
})
```

Actually, this won't work because Hono middleware needs to return a Response or call next(). A better approach is to configure `@hono/vite-dev-server` with an `exclude` option.

### Step 7: Configure Dev Server to Exclude Static Files

**File:** User's `vite.config.ts` (documented approach)

```typescript
import { defineConfig } from 'vite'
import devServer from '@hono/vite-dev-server'
import cloudwerk from '@cloudwerk/vite-plugin'

export default defineConfig({
  plugins: [
    cloudwerk(),
    devServer({
      entry: 'virtual:cloudwerk/server-entry',
      // Exclude static file requests from Hono handling
      exclude: [
        /^\/@.+$/,           // Vite internal routes
        /^\/node_modules\/.+$/, // Node modules
        /\.(ico|png|jpg|jpeg|gif|svg|webp|woff|woff2|ttf|eot|css|js|mjs|map|json|xml|txt|pdf|mp3|mp4|webm|ogg)$/,
      ],
    }),
  ],
})
```

However, this requires user configuration. We should handle this automatically in the Cloudwerk plugin.

### Step 8: Create Combined Plugin with Dev Server

Instead of requiring users to configure both plugins, Cloudwerk could include the dev server configuration:

**File:** `packages/vite-plugin/src/plugin.ts`

```typescript
import devServer from '@hono/vite-dev-server'

export function cloudwerkPlugin(options: CloudwerkVitePluginOptions = {}): Plugin[] {
  const cloudwerkPluginInstance = createCloudwerkPlugin(options)

  const devServerPlugin = devServer({
    entry: 'virtual:cloudwerk/server-entry',
    exclude: [
      /^\/@.+$/,
      /^\/node_modules\/.+$/,
      // Static file patterns
      /\.(ico|png|jpg|jpeg|gif|svg|webp|woff|woff2|ttf|eot)$/,
      /\.(css|js|mjs|map|json|xml|txt)$/,
      /\.(pdf|mp3|mp4|webm|ogg)$/,
    ],
  })

  return [cloudwerkPluginInstance, ...devServerPlugin]
}
```

This is a breaking change if users are already configuring `devServer` separately.

### Step 9: Production Build - Copy Public Assets

For production builds, we need to:
1. Copy `public/` contents to the build output
2. Configure Cloudflare Workers to serve these assets

**Option A: Use Vite's built-in behavior**

Vite already copies `publicDir` contents to the build output (`dist/`). We just need to ensure the Cloudflare Workers deployment picks these up.

**Option B: Generate asset manifest**

Generate a manifest file listing all public assets for the Cloudflare adapter:

```typescript
// Generated at build time
export const PUBLIC_ASSETS = [
  '/favicon.ico',
  '/logo.svg',
  '/images/hero.png',
  // ...
]
```

### Step 10: Update Templates

**Files:**
- `apps/create-cloudwerk-app/template-hono-jsx/public/favicon.ico`
- `apps/create-cloudwerk-app/template-react/public/favicon.ico`

Add a `public/` folder with a sample favicon:

```
template-hono-jsx/
├── app/
├── public/
│   └── favicon.ico
├── cloudwerk.config.ts
└── package.json
```

### Step 11: Update Documentation

**Files to update:**
- `apps/docs/src/content/docs/getting-started/project-structure.mdx` - Add public/ folder explanation
- `apps/docs/src/content/docs/reference/cloudwerk-config.mdx` - Document publicDir option
- `apps/docs/src/content/docs/api/configuration.mdx` - Document publicDir option

## Implementation Order

1. **Phase 1: Types and Config** (Step 1)
   - Add `publicDir` to types
   - Add default value
   - Update merge function

2. **Phase 2: Dev Server Integration** (Steps 5-8)
   - Configure Vite's publicDir
   - Handle static file exclusions in dev server
   - Test that static files are served in dev mode

3. **Phase 3: Templates** (Step 10)
   - Add public/ folder to templates
   - Include sample favicon

4. **Phase 4: Documentation** (Step 11)
   - Update docs to reflect actual implementation

5. **Phase 5: Production Build** (Step 9) - Future Work
   - Handle Cloudflare Workers asset serving
   - May require Cloudflare adapter implementation

## Testing Plan

### Unit Tests

**File:** `packages/core/src/__tests__/config.test.ts`

```typescript
describe('publicDir config', () => {
  it('should default to "public"', async () => {
    const config = await loadConfig('/path/without/config')
    expect(config.publicDir).toBe('public')
  })

  it('should respect user-provided publicDir', async () => {
    // Create temp config with custom publicDir
    const config = await loadConfig('/path/with/custom/config')
    expect(config.publicDir).toBe('assets')
  })
})
```

### Integration Tests

**File:** `packages/vite-plugin/src/__tests__/integration/static-assets.test.ts`

```typescript
describe('Static Assets', () => {
  let server: TestServer

  beforeAll(async () => {
    server = await createTestServer('fixtures/static-assets-app')
  })

  afterAll(async () => {
    await server.close()
  })

  it('should serve favicon.ico from public/', async () => {
    const response = await server.fetch('/favicon.ico')
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('image/')
  })

  it('should serve nested static files', async () => {
    const response = await server.fetch('/images/logo.png')
    expect(response.status).toBe(200)
  })

  it('should return 404 for missing static files', async () => {
    const response = await server.fetch('/nonexistent.png')
    expect(response.status).toBe(404)
  })

  it('should not conflict with routes', async () => {
    // Route at /about should work even if public/about doesn't exist
    const response = await server.fetch('/about')
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('text/html')
  })
})
```

### Manual Testing

1. Create project with `pnpm create cloudwerk-app`
2. Add `public/favicon.ico`
3. Run `pnpm dev`
4. Verify `http://localhost:3000/favicon.ico` returns the file
5. Verify routes still work correctly

## Files to Create/Modify

### Create
- `apps/create-cloudwerk-app/template-hono-jsx/public/favicon.ico`
- `apps/create-cloudwerk-app/template-react/public/favicon.ico`
- `packages/vite-plugin/src/__tests__/integration/fixtures/static-assets-app/`
- `packages/vite-plugin/src/__tests__/integration/static-assets.test.ts`

### Modify
- `packages/core/src/types.ts` - Add publicDir to CloudwerkConfig
- `packages/core/src/config.ts` - Add publicDir default and merge
- `packages/vite-plugin/src/plugin.ts` - Configure Vite publicDir
- `packages/vite-plugin/src/types.ts` - Add publicDir to resolved options
- `apps/docs/src/content/docs/getting-started/project-structure.mdx`

## Priority

Medium - Static assets are expected by developers coming from Next.js. The feature is partially documented but not implemented, causing confusion.

## Complexity

Medium - Dev mode is straightforward (Vite handles it), but production requires platform-specific handling for Cloudflare Workers.

## Dependencies

- For production builds: May require Cloudflare Workers adapter implementation
- For development: Works with existing Vite infrastructure

## Open Questions

1. **Production asset serving**: How should we handle static assets in Cloudflare Workers?
   - Workers Sites (KV-based)
   - Workers Assets (new Cloudflare feature)
   - Bundle assets into Worker (size limits apply)

2. **Cache headers**: Should we set default cache headers for static assets?
   - Vite sets appropriate headers in dev
   - Production may need different strategy

3. **Asset optimization**: Should we integrate with Vite's asset optimization?
   - Image optimization
   - CSS/JS minification
   - Already handled by Vite's build process
