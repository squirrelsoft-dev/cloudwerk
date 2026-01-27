/**
 * Tests for loading boundary and streaming support in registerRoutes.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as path from 'node:path'
import {
  scanRoutes,
  buildRouteManifest,
  resolveLayouts,
  resolveMiddleware,
  DEFAULT_CONFIG,
} from '@cloudwerk/core'
import { createApp } from '../createApp.js'
import { clearPageModuleCache } from '../loadPage.js'
import { clearLayoutModuleCache } from '../loadLayout.js'
import { clearLoadingModuleCache } from '../loadLoading.js'

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

/**
 * Helper to create an app with full middleware stack from a fixture directory.
 */
async function createTestApp(routesDir: string, verbose = false) {
  const logger = createMockLogger()
  const { manifest, scanResult } = await createManifestAndScanResult(routesDir)
  const { app } = await createApp(manifest, scanResult, DEFAULT_CONFIG, logger, verbose)
  return { app, logger }
}

/**
 * Helper to read all chunks from a streaming response.
 */
async function readStreamingResponse(response: Response): Promise<string> {
  const reader = response.body?.getReader()
  if (!reader) {
    return response.text()
  }

  const chunks: string[] = []
  const decoder = new TextDecoder()

  let done = false
  while (!done) {
    const result = await reader.read()
    done = result.done
    if (result.value) {
      chunks.push(decoder.decode(result.value, { stream: true }))
    }
  }

  return chunks.join('')
}

describe('registerRoutes - loading boundary support', () => {
  beforeEach(() => {
    clearPageModuleCache()
    clearLayoutModuleCache()
    clearLoadingModuleCache()
  })

  describe('loading.tsx resolution', () => {
    it('should load loading boundary module when present', async () => {
      const routesDir = path.join(FIXTURES_DIR, 'with-loading/app')
      const { logger } = await createTestApp(routesDir, true)

      // In verbose mode, should log loading boundary
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Loaded loading boundary')
      )
    })

    it('should resolve nearest loading boundary (nested over root)', async () => {
      const routesDir = path.join(FIXTURES_DIR, 'with-loading/app')
      const { app } = await createTestApp(routesDir)

      // Dashboard page should use dashboard/loading.tsx, not root loading.tsx
      const response = await app.fetch(new Request('http://localhost/dashboard'))
      expect(response.status).toBe(200)
    })
  })

  describe('streaming render', () => {
    it('should render page content with loader data', async () => {
      const routesDir = path.join(FIXTURES_DIR, 'with-loading/app')
      const { app } = await createTestApp(routesDir)

      // Request slow-loader page (has loader that takes 50ms)
      const response = await app.fetch(new Request('http://localhost/slow-loader'))

      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toContain('text/html')

      const html = await readStreamingResponse(response)

      // Final content should be present
      expect(html).toContain('data-page="slow-loader"')
      expect(html).toContain('Data loaded successfully')
    })

    it('should wrap content with layouts', async () => {
      const routesDir = path.join(FIXTURES_DIR, 'with-loading/app')
      const { app } = await createTestApp(routesDir)

      const response = await app.fetch(new Request('http://localhost/dashboard'))

      expect(response.status).toBe(200)
      const html = await readStreamingResponse(response)

      // Should have both layouts
      expect(html).toContain('data-layout="root"')
      expect(html).toContain('data-layout="dashboard"')
      // And page content
      expect(html).toContain('data-page="dashboard"')
    })

    it('should include loader data in final render', async () => {
      const routesDir = path.join(FIXTURES_DIR, 'with-loading/app')
      const { app } = await createTestApp(routesDir)

      const response = await app.fetch(new Request('http://localhost/dashboard'))

      expect(response.status).toBe(200)
      const html = await readStreamingResponse(response)

      // Loader data should be rendered
      expect(html).toContain('Users: 1234')
      expect(html).toContain('Revenue: $56789')
    })
  })

  describe('streaming: false config', () => {
    it('should not stream when streaming is disabled in config', async () => {
      const routesDir = path.join(FIXTURES_DIR, 'with-loading/app')
      const { app } = await createTestApp(routesDir)

      // This page has streaming: false in config
      const response = await app.fetch(new Request('http://localhost/no-streaming'))

      expect(response.status).toBe(200)
      const html = await readStreamingResponse(response)

      // Should have page content (loader completed before response)
      expect(html).toContain('data-page="no-streaming"')
      expect(html).toContain('Loaded without streaming')

      // Should NOT have loading boundary content
      expect(html).not.toContain('data-loading="no-streaming"')
    })
  })

  describe('nested loading boundary resolution', () => {
    it('should use nested loading boundary for deep pages', async () => {
      const routesDir = path.join(FIXTURES_DIR, 'with-loading/app')
      const { app } = await createTestApp(routesDir)

      const response = await app.fetch(new Request('http://localhost/nested/deep'))

      expect(response.status).toBe(200)
      const html = await readStreamingResponse(response)

      // Should have final content
      expect(html).toContain('data-page="deep"')
      expect(html).toContain('deeply nested')
    })
  })

  describe('pages without loading boundary', () => {
    it('should work normally when no loading.tsx exists in fixture without loading', async () => {
      // Use a fixture without loading boundaries
      const routesDir = path.join(FIXTURES_DIR, 'with-pages/app')
      const { app } = await createTestApp(routesDir)

      const response = await app.fetch(new Request('http://localhost/'))

      expect(response.status).toBe(200)
      const html = await response.text()

      // Should render normally
      expect(html).toContain('Home Page')
    })
  })

  describe('pages without loaders', () => {
    it('should render immediately when page has no loader', async () => {
      const routesDir = path.join(FIXTURES_DIR, 'with-loading/app')
      const { app } = await createTestApp(routesDir)

      // Home page has no loader
      const response = await app.fetch(new Request('http://localhost/'))

      expect(response.status).toBe(200)
      const html = await readStreamingResponse(response)

      // Should have page content
      expect(html).toContain('data-page="home"')
      expect(html).toContain('Home Page')
    })
  })

  describe('loading boundary wrapped in layouts', () => {
    it('should wrap loading state with layouts', async () => {
      const routesDir = path.join(FIXTURES_DIR, 'with-loading/app')
      const { app } = await createTestApp(routesDir)

      // Dashboard uses both root and dashboard layouts
      const response = await app.fetch(new Request('http://localhost/dashboard'))

      expect(response.status).toBe(200)
      const html = await readStreamingResponse(response)

      // Root layout should be present
      expect(html).toContain('data-layout="root"')
    })
  })
})
