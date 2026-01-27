/**
 * Tests for page registration in registerRoutes.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as path from 'node:path'
import { Hono } from 'hono'
import {
  scanRoutes,
  buildRouteManifest,
  resolveLayouts,
  resolveMiddleware,
} from '@cloudwerk/core'
import { registerRoutes } from '../registerRoutes.js'
import { clearPageModuleCache } from '../loadPage.js'
import { clearLayoutModuleCache } from '../loadLayout.js'

const FIXTURES_DIR = path.join(__dirname, '../../../__fixtures__')

// Create mock logger
function createMockLogger() {
  return {
    info: vi.fn(),
    success: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    log: vi.fn(),
  }
}

/**
 * Helper to create a route manifest from a fixture directory.
 */
async function createManifest(routesDir: string) {
  const scanResult = await scanRoutes(routesDir, { extensions: ['.ts', '.tsx'] })
  return buildRouteManifest(scanResult, routesDir, resolveLayouts, resolveMiddleware)
}

describe('registerRoutes - page support', () => {
  beforeEach(() => {
    clearPageModuleCache()
    clearLayoutModuleCache()
  })

  describe('basic page registration', () => {
    it('should register page.tsx as GET route', async () => {
      const app = new Hono()
      const logger = createMockLogger()
      const routesDir = path.join(FIXTURES_DIR, 'with-pages/app')
      const manifest = await createManifest(routesDir)

      const routes = await registerRoutes(app, manifest, logger)

      // Find the root page route
      const homeRoute = routes.find((r) => r.pattern === '/' && r.method === 'GET')
      expect(homeRoute).toBeDefined()
      expect(homeRoute?.filePath).toContain('page.tsx')
    })

    it('should return HTML response with correct content-type', async () => {
      const app = new Hono()
      const logger = createMockLogger()
      const routesDir = path.join(FIXTURES_DIR, 'with-pages/app')
      const manifest = await createManifest(routesDir)

      await registerRoutes(app, manifest, logger)

      const response = await app.request('http://localhost/')
      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toContain('text/html')

      const html = await response.text()
      expect(html).toContain('Home Page')
    })
  })

  describe('layout nesting', () => {
    it('should apply layouts in correct order (root wraps all)', async () => {
      const app = new Hono()
      const logger = createMockLogger()
      const routesDir = path.join(FIXTURES_DIR, 'with-pages/app')
      const manifest = await createManifest(routesDir)

      await registerRoutes(app, manifest, logger)

      const response = await app.request('http://localhost/dashboard')
      const html = await response.text()

      // Root layout should be outermost (html/body with data-layout="root")
      expect(html).toContain('data-layout="root"')
      expect(html).toContain('data-layout="dashboard"')

      // Verify nesting order: root contains dashboard
      // The root layout with data-layout="root" should come before data-layout="dashboard"
      const rootLayoutIndex = html.indexOf('data-layout="root"')
      const dashboardLayoutIndex = html.indexOf('data-layout="dashboard"')
      expect(rootLayoutIndex).toBeLessThan(dashboardLayoutIndex)

      // Page content should be innermost
      expect(html).toContain('Dashboard')
    })

    it('should render page without layouts when none exist', async () => {
      // The async page doesn't have its own layout, but root layout applies
      const app = new Hono()
      const logger = createMockLogger()
      const routesDir = path.join(FIXTURES_DIR, 'with-pages/app')
      const manifest = await createManifest(routesDir)

      await registerRoutes(app, manifest, logger)

      const response = await app.request('http://localhost/async')
      const html = await response.text()

      // Should have root layout wrapping
      expect(html).toContain('data-layout="root"')
      // But no dashboard layout
      expect(html).not.toContain('data-layout="dashboard"')
      // Should have async page content
      expect(html).toContain('Async Page')
    })
  })

  describe('dynamic parameters', () => {
    it('should pass params from dynamic segments to page', async () => {
      const app = new Hono()
      const logger = createMockLogger()
      const routesDir = path.join(FIXTURES_DIR, 'with-pages/app')
      const manifest = await createManifest(routesDir)

      await registerRoutes(app, manifest, logger)

      const response = await app.request('http://localhost/users/123')
      const html = await response.text()

      expect(html).toContain('User: 123')
    })
  })

  describe('searchParams', () => {
    it('should parse single searchParams correctly', async () => {
      const app = new Hono()
      const logger = createMockLogger()
      const routesDir = path.join(FIXTURES_DIR, 'with-pages/app')
      const manifest = await createManifest(routesDir)

      await registerRoutes(app, manifest, logger)

      const response = await app.request('http://localhost/users/456?tab=settings')
      const html = await response.text()

      expect(html).toContain('User: 456')
      expect(html).toContain('Tab: settings')
    })

    it('should parse multiple searchParams with same key as array', async () => {
      const app = new Hono()
      const logger = createMockLogger()
      const routesDir = path.join(FIXTURES_DIR, 'with-pages/app')
      const manifest = await createManifest(routesDir)

      await registerRoutes(app, manifest, logger)

      const response = await app.request('http://localhost/users/789?ref=a&ref=b')
      const html = await response.text()

      expect(html).toContain('User: 789')
      expect(html).toContain('Ref: a, b')
    })
  })

  describe('async components', () => {
    it('should await async page component (Server Component)', async () => {
      const app = new Hono()
      const logger = createMockLogger()
      const routesDir = path.join(FIXTURES_DIR, 'with-pages/app')
      const manifest = await createManifest(routesDir)

      await registerRoutes(app, manifest, logger)

      const response = await app.request('http://localhost/async')
      const html = await response.text()

      expect(response.status).toBe(200)
      expect(html).toContain('Async Page')
      expect(html).toContain('Async data loaded')
    })
  })

  describe('route config', () => {
    it('should apply route config from page exports', async () => {
      const app = new Hono()
      const logger = createMockLogger()
      const routesDir = path.join(FIXTURES_DIR, 'with-pages/app')
      const manifest = await createManifest(routesDir)

      await registerRoutes(app, manifest, logger, true) // verbose mode

      // Verify config was applied (logged in verbose mode)
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Applied page config')
      )
    })
  })

  describe('error handling', () => {
    it('should return 500 when page component throws', async () => {
      const app = new Hono()
      const logger = createMockLogger()
      const routesDir = path.join(FIXTURES_DIR, 'with-pages/app')
      const manifest = await createManifest(routesDir)

      await registerRoutes(app, manifest, logger)

      const response = await app.request('http://localhost/error-page')
      expect(response.status).toBe(500)

      const html = await response.text()
      expect(html).toContain('Internal Server Error')
    })

    it('should log error details for debugging', async () => {
      const app = new Hono()
      const logger = createMockLogger()
      const routesDir = path.join(FIXTURES_DIR, 'with-pages/app')
      const manifest = await createManifest(routesDir)

      await registerRoutes(app, manifest, logger)

      await app.request('http://localhost/error-page')

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error rendering page')
      )
    })
  })
})
