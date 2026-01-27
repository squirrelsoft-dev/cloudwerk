/**
 * Tests for error boundary integration in registerRoutes.
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
import { clearErrorBoundaryModuleCache } from '../loadErrorBoundary.js'
import { clearNotFoundModuleCache } from '../loadNotFound.js'

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
 * Helper to create a route manifest and scan result from a fixture directory.
 */
async function createManifestAndScanResult(routesDir: string) {
  const scanResult = await scanRoutes(routesDir, { extensions: ['.ts', '.tsx'] })
  const manifest = buildRouteManifest(scanResult, routesDir, resolveLayouts, resolveMiddleware)
  return { manifest, scanResult }
}

describe('registerRoutes - error boundary support', () => {
  beforeEach(() => {
    clearPageModuleCache()
    clearLayoutModuleCache()
    clearErrorBoundaryModuleCache()
    clearNotFoundModuleCache()
  })

  describe('error.tsx boundary', () => {
    it('should render root error boundary when loader throws', async () => {
      const app = new Hono()
      const logger = createMockLogger()
      const routesDir = path.join(FIXTURES_DIR, 'with-error-boundaries/app')
      const { manifest, scanResult } = await createManifestAndScanResult(routesDir)

      await registerRoutes(app, manifest, scanResult, logger)

      const response = await app.request('http://localhost/throws-error')

      expect(response.status).toBe(500)
      const html = await response.text()
      expect(html).toContain('data-error-boundary="root"')
      expect(html).toContain('Something went wrong!')
      expect(html).toContain('Test error from loader')
      expect(html).toContain('data-error-type')
      expect(html).toContain('loader')
    })

    it('should render closest error boundary (dashboard over root)', async () => {
      const app = new Hono()
      const logger = createMockLogger()
      const routesDir = path.join(FIXTURES_DIR, 'with-error-boundaries/app')
      const { manifest, scanResult } = await createManifestAndScanResult(routesDir)

      await registerRoutes(app, manifest, scanResult, logger)

      const response = await app.request('http://localhost/dashboard/throws-error')

      expect(response.status).toBe(500)
      const html = await response.text()
      // Should use dashboard error boundary, not root
      expect(html).toContain('data-error-boundary="dashboard"')
      expect(html).toContain('Dashboard Error')
      expect(html).toContain('Dashboard error from loader')
    })

    it('should wrap error boundary with layouts', async () => {
      const app = new Hono()
      const logger = createMockLogger()
      const routesDir = path.join(FIXTURES_DIR, 'with-error-boundaries/app')
      const { manifest, scanResult } = await createManifestAndScanResult(routesDir)

      await registerRoutes(app, manifest, scanResult, logger)

      const response = await app.request('http://localhost/throws-error')

      expect(response.status).toBe(500)
      const html = await response.text()
      // Error boundary should be wrapped with root layout
      expect(html).toContain('data-layout="root"')
      expect(html).toContain('data-error-boundary="root"')
    })

    it('should include error digest for production logging', async () => {
      const app = new Hono()
      const logger = createMockLogger()
      const routesDir = path.join(FIXTURES_DIR, 'with-error-boundaries/app')
      const { manifest, scanResult } = await createManifestAndScanResult(routesDir)

      await registerRoutes(app, manifest, scanResult, logger)

      const response = await app.request('http://localhost/throws-error')

      expect(response.status).toBe(500)
      const html = await response.text()
      // Digest should be present in development mode
      expect(html).toContain('data-error-digest')
      expect(html).toContain('Error ID:')
    })

    it('should log error with digest', async () => {
      const app = new Hono()
      const logger = createMockLogger()
      const routesDir = path.join(FIXTURES_DIR, 'with-error-boundaries/app')
      const { manifest, scanResult } = await createManifestAndScanResult(routesDir)

      await registerRoutes(app, manifest, scanResult, logger)

      await app.request('http://localhost/throws-error')

      // Verify error was logged with digest
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringMatching(/Error \[\w+\] in/)
      )
    })
  })

  describe('not-found.tsx boundary', () => {
    it('should render not-found boundary when notFound() is called', async () => {
      const app = new Hono()
      const logger = createMockLogger()
      const routesDir = path.join(FIXTURES_DIR, 'with-error-boundaries/app')
      const { manifest, scanResult } = await createManifestAndScanResult(routesDir)

      await registerRoutes(app, manifest, scanResult, logger)

      const response = await app.request('http://localhost/throws-not-found')

      expect(response.status).toBe(404)
      const html = await response.text()
      expect(html).toContain('data-not-found="root"')
      expect(html).toContain('404 - Page Not Found')
    })

    it('should wrap not-found boundary with layouts', async () => {
      const app = new Hono()
      const logger = createMockLogger()
      const routesDir = path.join(FIXTURES_DIR, 'with-error-boundaries/app')
      const { manifest, scanResult } = await createManifestAndScanResult(routesDir)

      await registerRoutes(app, manifest, scanResult, logger)

      const response = await app.request('http://localhost/throws-not-found')

      expect(response.status).toBe(404)
      const html = await response.text()
      // Not-found boundary should be wrapped with root layout
      expect(html).toContain('data-layout="root"')
      expect(html).toContain('data-not-found="root"')
    })
  })

  describe('action error handling', () => {
    it('should render error boundary when action throws', async () => {
      const app = new Hono()
      const logger = createMockLogger()
      const routesDir = path.join(FIXTURES_DIR, 'with-error-boundaries/app')
      const { manifest, scanResult } = await createManifestAndScanResult(routesDir)

      await registerRoutes(app, manifest, scanResult, logger)

      const formData = new FormData()
      formData.append('intent', 'error')

      const response = await app.request('http://localhost/action-error', {
        method: 'POST',
        body: formData,
      })

      expect(response.status).toBe(500)
      const html = await response.text()
      expect(html).toContain('data-error-boundary="root"')
      expect(html).toContain('Action error')
      // Verify error type is 'action'
      expect(html).toContain('action')
    })
  })

  describe('fallback behavior', () => {
    it('should render fallback error HTML when no error boundary exists', async () => {
      // Use a fixture without error boundaries
      const app = new Hono()
      const logger = createMockLogger()
      const routesDir = path.join(FIXTURES_DIR, 'with-pages/app')
      const { manifest, scanResult } = await createManifestAndScanResult(routesDir)

      await registerRoutes(app, manifest, scanResult, logger)

      // This page throws an error
      const response = await app.request('http://localhost/error-page')

      expect(response.status).toBe(500)
      const html = await response.text()
      expect(html).toContain('Internal Server Error')
    })

    it('should fallback to Hono notFound when no not-found boundary exists', async () => {
      // Use a fixture without not-found boundaries
      const app = new Hono()
      const logger = createMockLogger()
      const routesDir = path.join(FIXTURES_DIR, 'with-pages/app')
      const { manifest, scanResult } = await createManifestAndScanResult(routesDir)

      await registerRoutes(app, manifest, scanResult, logger)

      // This page throws NotFoundError
      const response = await app.request('http://localhost/not-found-test')

      expect(response.status).toBe(404)
    })
  })

  describe('normal page rendering', () => {
    it('should still render pages normally when no errors occur', async () => {
      const app = new Hono()
      const logger = createMockLogger()
      const routesDir = path.join(FIXTURES_DIR, 'with-error-boundaries/app')
      const { manifest, scanResult } = await createManifestAndScanResult(routesDir)

      await registerRoutes(app, manifest, scanResult, logger)

      const response = await app.request('http://localhost/')

      expect(response.status).toBe(200)
      const html = await response.text()
      expect(html).toContain('data-page="home"')
      expect(html).toContain('Home Page')
      // Should not contain error boundary
      expect(html).not.toContain('data-error-boundary')
    })

    it('should render dashboard page normally', async () => {
      const app = new Hono()
      const logger = createMockLogger()
      const routesDir = path.join(FIXTURES_DIR, 'with-error-boundaries/app')
      const { manifest, scanResult } = await createManifestAndScanResult(routesDir)

      await registerRoutes(app, manifest, scanResult, logger)

      const response = await app.request('http://localhost/dashboard')

      expect(response.status).toBe(200)
      const html = await response.text()
      expect(html).toContain('data-page="dashboard"')
      expect(html).toContain('data-layout="dashboard"')
      expect(html).toContain('data-layout="root"')
    })
  })
})
