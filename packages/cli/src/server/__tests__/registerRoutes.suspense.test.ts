/**
 * Tests for native Suspense boundary support in registerRoutes.
 *
 * These tests verify that pages using Hono's Suspense component
 * properly stream content using renderToStream().
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

describe('registerRoutes - Suspense boundary support', () => {
  beforeEach(() => {
    clearPageModuleCache()
    clearLayoutModuleCache()
  })

  describe('single Suspense boundary', () => {
    it('should render page with Suspense fallback initially, then async content', async () => {
      const routesDir = path.join(FIXTURES_DIR, 'with-suspense/app')
      const { app } = await createTestApp(routesDir)

      const response = await app.fetch(new Request('http://localhost/'))

      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toContain('text/html')

      const html = await readStreamingResponse(response)

      // Should have page structure
      expect(html).toContain('data-page="home"')
      expect(html).toContain('Home Page with Suspense')

      // Should have async content (it streamed in)
      expect(html).toContain('data-content="async"')
      expect(html).toContain('Async content loaded')
    })

    it('should include DOCTYPE html', async () => {
      const routesDir = path.join(FIXTURES_DIR, 'with-suspense/app')
      const { app } = await createTestApp(routesDir)

      const response = await app.fetch(new Request('http://localhost/'))
      const html = await readStreamingResponse(response)

      expect(html).toMatch(/^<!DOCTYPE html>/)
    })

    it('should wrap content with root layout', async () => {
      const routesDir = path.join(FIXTURES_DIR, 'with-suspense/app')
      const { app } = await createTestApp(routesDir)

      const response = await app.fetch(new Request('http://localhost/'))
      const html = await readStreamingResponse(response)

      expect(html).toContain('data-layout="root"')
      expect(html).toContain('<html lang="en">')
    })
  })

  describe('nested Suspense boundaries', () => {
    it('should render page with multiple Suspense boundaries', async () => {
      const routesDir = path.join(FIXTURES_DIR, 'with-suspense/app')
      const { app } = await createTestApp(routesDir)

      const response = await app.fetch(new Request('http://localhost/nested'))

      expect(response.status).toBe(200)
      const html = await readStreamingResponse(response)

      // Should have page structure
      expect(html).toContain('data-page="nested"')
      expect(html).toContain('Nested Suspense Page')

      // Should have all async content (they all streamed in)
      expect(html).toContain('data-content="fast"')
      expect(html).toContain('data-content="slow"')
      expect(html).toContain('data-content="nested-outer"')
    })

    it('should render nested async content within Suspense', async () => {
      const routesDir = path.join(FIXTURES_DIR, 'with-suspense/app')
      const { app } = await createTestApp(routesDir)

      const response = await app.fetch(new Request('http://localhost/nested'))
      const html = await readStreamingResponse(response)

      // Nested content should be present
      expect(html).toContain('Outer content')
    })
  })

  describe('Suspense with loader', () => {
    it('should render page with both loader data and Suspense content', async () => {
      const routesDir = path.join(FIXTURES_DIR, 'with-suspense/app')
      const { app } = await createTestApp(routesDir)

      const response = await app.fetch(new Request('http://localhost/with-loader'))

      expect(response.status).toBe(200)
      const html = await readStreamingResponse(response)

      // Should have page structure
      expect(html).toContain('data-page="with-loader"')

      // Should have loader data rendered
      expect(html).toContain('data-title')
      expect(html).toContain('Dynamic Title from Loader')
      expect(html).toContain('data-timestamp')

      // Should have async Suspense content
      expect(html).toContain('data-content="stats"')
      expect(html).toContain('Users: 1000')
      expect(html).toContain('Revenue: $50000')
    })

    it('should execute loader before streaming starts', async () => {
      const routesDir = path.join(FIXTURES_DIR, 'with-suspense/app')
      const { app } = await createTestApp(routesDir)

      const response = await app.fetch(new Request('http://localhost/with-loader'))
      const html = await readStreamingResponse(response)

      // Loader data should be present in the initial render
      expect(html).toContain('Dynamic Title from Loader')
      // Timestamp should be a valid number
      expect(html).toMatch(/Loaded at: \d+/)
    })
  })

  describe('streaming response characteristics', () => {
    it('should return a streaming response', async () => {
      const routesDir = path.join(FIXTURES_DIR, 'with-suspense/app')
      const { app } = await createTestApp(routesDir)

      const response = await app.fetch(new Request('http://localhost/'))

      // Response should have a body that is a ReadableStream
      expect(response.body).toBeInstanceOf(ReadableStream)
    })

    it('should have correct content-type header', async () => {
      const routesDir = path.join(FIXTURES_DIR, 'with-suspense/app')
      const { app } = await createTestApp(routesDir)

      const response = await app.fetch(new Request('http://localhost/'))

      expect(response.headers.get('content-type')).toBe('text/html; charset=utf-8')
    })
  })
})
