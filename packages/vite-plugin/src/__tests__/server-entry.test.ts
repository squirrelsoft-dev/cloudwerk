/**
 * @cloudwerk/vite-plugin - Server Entry Generation Tests
 *
 * Tests for the server entry virtual module generation.
 */

import { describe, it, expect } from 'vitest'
import { generateServerEntry } from '../virtual-modules/server-entry.js'
import type { RouteManifest, ScanResult } from '@cloudwerk/core/build'

// Helper to create minimal scan result
function createScanResult(overrides: Partial<ScanResult> = {}): ScanResult {
  return {
    routes: [],
    layouts: [],
    middleware: [],
    loading: [],
    errors: [],
    notFound: [],
    ...overrides,
  }
}

// Helper to create resolved options
function createOptions() {
  return {
    renderer: 'hono-jsx' as const,
    routesDir: 'app',
    appDir: 'app',
    publicDir: 'public',
    viteConfig: {},
    root: '/project',
  }
}

// Helper to create a minimal manifest
function createManifest(overrides: Partial<RouteManifest> = {}): RouteManifest {
  return {
    routes: [],
    layouts: new Map(),
    middleware: new Map(),
    errorBoundaries: new Map(),
    notFoundBoundaries: new Map(),
    errors: [],
    warnings: [],
    generatedAt: new Date(),
    rootDir: '/project/app',
    ...overrides,
  }
}

describe('generateServerEntry', () => {
  describe('basic structure', () => {
    it('should generate valid module with imports', () => {
      const manifest = createManifest()

      const code = generateServerEntry(manifest, createScanResult(), createOptions())

      expect(code).toContain("import { Hono } from 'hono'")
      expect(code).toContain("import { contextMiddleware, createHandlerAdapter, createMiddlewareAdapter, setRouteConfig, NotFoundError, RedirectError } from '@cloudwerk/core/runtime'")
      expect(code).toContain("import { setActiveRenderer } from '@cloudwerk/ui'")
      expect(code).toContain('export default app')
    })

    it('should set the renderer from options', () => {
      const manifest = createManifest()

      const code = generateServerEntry(manifest, createScanResult(), createOptions())

      expect(code).toContain("setActiveRenderer('hono-jsx')")
    })
  })

  describe('middleware imports', () => {
    it('should import middleware using named export syntax', () => {
      const manifest = createManifest({
        routes: [
          {
            urlPattern: '/dashboard',
            filePath: 'dashboard/page.tsx',
            absolutePath: '/project/app/dashboard/page.tsx',
            fileType: 'page',
            segments: [{ type: 'static', value: 'dashboard' }],
            layouts: [],
            middleware: ['/project/app/middleware.ts'],
            priority: 1,
          },
        ],
        middleware: new Map([['.', '/project/app/middleware.ts']]),
      })

      const code = generateServerEntry(manifest, createScanResult(), createOptions())

      // Should use named import { middleware as ... } not default import
      expect(code).toContain("import { middleware as middleware_0 } from '/project/app/middleware.ts'")
      expect(code).not.toContain("import middleware_0 from")
    })

    it('should wrap middleware with createMiddlewareAdapter', () => {
      const manifest = createManifest({
        routes: [
          {
            urlPattern: '/dashboard',
            filePath: 'dashboard/page.tsx',
            absolutePath: '/project/app/dashboard/page.tsx',
            fileType: 'page',
            segments: [{ type: 'static', value: 'dashboard' }],
            layouts: [],
            middleware: ['/project/app/middleware.ts'],
            priority: 1,
          },
        ],
        middleware: new Map([['.', '/project/app/middleware.ts']]),
      })

      const code = generateServerEntry(manifest, createScanResult(), createOptions())

      // Check the registerPage helper wraps middleware with adapter
      expect(code).toContain('createMiddlewareAdapter(mw)')
    })
  })

  describe('page route registration', () => {
    it('should register page routes with layouts and middleware', () => {
      const manifest = createManifest({
        routes: [
          {
            urlPattern: '/users',
            filePath: 'users/page.tsx',
            absolutePath: '/project/app/users/page.tsx',
            fileType: 'page',
            segments: [{ type: 'static', value: 'users' }],
            layouts: ['/project/app/layout.tsx'],
            middleware: [],
            priority: 1,
          },
        ],
        layouts: new Map([['.', '/project/app/layout.tsx']]),
      })

      const code = generateServerEntry(manifest, createScanResult(), createOptions())

      expect(code).toContain("import * as page_0 from '/project/app/users/page.tsx'")
      expect(code).toContain("import * as layout_0 from '/project/app/layout.tsx'")
      expect(code).toContain("registerPage(app, '/users', page_0, [layout_0], [], null, null)")
    })

    it('should handle dynamic routes with :param syntax', () => {
      const manifest = createManifest({
        routes: [
          {
            urlPattern: '/users/:id',
            filePath: 'users/[id]/page.tsx',
            absolutePath: '/project/app/users/[id]/page.tsx',
            fileType: 'page',
            segments: [
              { type: 'static', value: 'users' },
              { type: 'dynamic', name: 'id' },
            ],
            layouts: [],
            middleware: [],
            priority: 11,
          },
        ],
      })

      const code = generateServerEntry(manifest, createScanResult(), createOptions())

      expect(code).toContain("registerPage(app, '/users/:id', page_0, [], [], null, null)")
    })
  })

  describe('catch-all routes', () => {
    it('should handle catch-all routes with :param{.+} syntax', () => {
      const manifest = createManifest({
        routes: [
          {
            urlPattern: '/docs/:slug{.+}',
            filePath: 'docs/[...slug]/page.tsx',
            absolutePath: '/project/app/docs/[...slug]/page.tsx',
            fileType: 'page',
            segments: [
              { type: 'static', value: 'docs' },
              { type: 'catchAll', name: 'slug' },
            ],
            layouts: [],
            middleware: [],
            priority: 101,
          },
        ],
      })

      const code = generateServerEntry(manifest, createScanResult(), createOptions())

      expect(code).toContain("registerPage(app, '/docs/:slug{.+}', page_0, [], [], null, null)")
    })
  })

  describe('optional catch-all routes', () => {
    it('should register both base path and wildcard for optional catch-all', () => {
      const manifest = createManifest({
        routes: [
          {
            urlPattern: '/shop/:cat{.*}',
            filePath: 'shop/[[...cat]]/page.tsx',
            absolutePath: '/project/app/shop/[[...cat]]/page.tsx',
            fileType: 'page',
            segments: [
              { type: 'static', value: 'shop' },
              { type: 'optionalCatchAll', name: 'cat' },
            ],
            layouts: [],
            middleware: [],
            priority: 1001,
          },
        ],
      })

      const code = generateServerEntry(manifest, createScanResult(), createOptions())

      // Should register base path (without catch-all) first
      expect(code).toContain("registerPage(app, '/shop', page_0, [], [], null, null)")
      // Then register the full pattern
      expect(code).toContain("registerPage(app, '/shop/:cat{.*}', page_0, [], [], null, null)")
    })

    it('should handle optional catch-all at root level', () => {
      const manifest = createManifest({
        routes: [
          {
            urlPattern: '/:slug{.*}',
            filePath: '[[...slug]]/page.tsx',
            absolutePath: '/project/app/[[...slug]]/page.tsx',
            fileType: 'page',
            segments: [{ type: 'optionalCatchAll', name: 'slug' }],
            layouts: [],
            middleware: [],
            priority: 1000,
          },
        ],
      })

      const code = generateServerEntry(manifest, createScanResult(), createOptions())

      // Base path should be '/'
      expect(code).toContain("registerPage(app, '/', page_0, [], [], null, null)")
      expect(code).toContain("registerPage(app, '/:slug{.*}', page_0, [], [], null, null)")
    })
  })

  describe('API route registration', () => {
    it('should register API routes with registerRoute helper', () => {
      const manifest = createManifest({
        routes: [
          {
            urlPattern: '/api/users',
            filePath: 'api/users/route.ts',
            absolutePath: '/project/app/api/users/route.ts',
            fileType: 'route',
            segments: [
              { type: 'static', value: 'api' },
              { type: 'static', value: 'users' },
            ],
            layouts: [],
            middleware: [],
            priority: 2,
          },
        ],
      })

      const code = generateServerEntry(manifest, createScanResult(), createOptions())

      expect(code).toContain("import * as route_0 from '/project/app/api/users/route.ts'")
      expect(code).toContain("registerRoute(app, '/api/users', route_0, [])")
    })
  })

  describe('error and 404 handlers', () => {
    it('should include default notFound handler', () => {
      const manifest = createManifest()

      const code = generateServerEntry(manifest, createScanResult(), createOptions())

      expect(code).toContain('app.notFound(async (c) => {')
      expect(code).toContain("return c.json({ error: 'Not Found', path }, 404)")
    })

    it('should include default onError handler', () => {
      const manifest = createManifest()

      const code = generateServerEntry(manifest, createScanResult(), createOptions())

      expect(code).toContain('app.onError(async (err, c) => {')
      expect(code).toContain("return c.json({ error: 'Internal Server Error', message: err.message }, 500)")
    })
  })

  describe('layout chain', () => {
    it('should pass multiple layouts in correct order', () => {
      const manifest = createManifest({
        routes: [
          {
            urlPattern: '/admin/users',
            filePath: 'admin/users/page.tsx',
            absolutePath: '/project/app/admin/users/page.tsx',
            fileType: 'page',
            segments: [
              { type: 'static', value: 'admin' },
              { type: 'static', value: 'users' },
            ],
            layouts: ['/project/app/layout.tsx', '/project/app/admin/layout.tsx'],
            middleware: [],
            priority: 2,
          },
        ],
        layouts: new Map([
          ['.', '/project/app/layout.tsx'],
          ['admin', '/project/app/admin/layout.tsx'],
        ]),
      })

      const code = generateServerEntry(manifest, createScanResult(), createOptions())

      expect(code).toContain("registerPage(app, '/admin/users', page_0, [layout_0, layout_1], [], null, null)")
    })
  })

  describe('middleware chain', () => {
    it('should pass multiple middleware in correct order', () => {
      const manifest = createManifest({
        routes: [
          {
            urlPattern: '/admin/settings',
            filePath: 'admin/settings/page.tsx',
            absolutePath: '/project/app/admin/settings/page.tsx',
            fileType: 'page',
            segments: [
              { type: 'static', value: 'admin' },
              { type: 'static', value: 'settings' },
            ],
            layouts: [],
            middleware: ['/project/app/middleware.ts', '/project/app/admin/middleware.ts'],
            priority: 2,
          },
        ],
        middleware: new Map([
          ['.', '/project/app/middleware.ts'],
          ['admin', '/project/app/admin/middleware.ts'],
        ]),
      })

      const code = generateServerEntry(manifest, createScanResult(), createOptions())

      expect(code).toContain("import { middleware as middleware_0 } from '/project/app/middleware.ts'")
      expect(code).toContain("import { middleware as middleware_1 } from '/project/app/admin/middleware.ts'")
      expect(code).toContain("registerPage(app, '/admin/settings', page_0, [], [middleware_0, middleware_1], null, null)")
    })
  })
})
