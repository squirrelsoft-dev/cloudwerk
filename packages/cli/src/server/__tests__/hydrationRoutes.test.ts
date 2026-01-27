/**
 * Tests for hydration routes.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Hono } from 'hono'
import { registerHydrationRoutes, clearRuntimeCache } from '../hydrationRoutes.js'
import { createManifestTracker, trackIfClientComponent } from '../hydrationManifest.js'
import type { Logger } from '../../types.js'
import * as fs from 'node:fs'
import * as path from 'node:path'

// Mock logger
const mockLogger: Logger = {
  info: vi.fn(),
  success: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  log: vi.fn(),
}

// Test fixtures directory
const fixturesDir = path.resolve(__dirname, '../../__fixtures__')
const tempDir = path.join(fixturesDir, 'temp-hydration')

describe('hydrationRoutes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearRuntimeCache()

    // Ensure temp directory exists
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }
  })

  describe('registerHydrationRoutes', () => {
    it('should register routes at /__cloudwerk/*', async () => {
      const app = new Hono()
      const tracker = createManifestTracker(tempDir)

      registerHydrationRoutes(app, {
        tracker,
        appDir: tempDir,
        logger: mockLogger,
      })

      // Check that we can get the runtime
      const res = await app.request('/__cloudwerk/runtime.js')
      expect(res.status).toBe(200)
      expect(res.headers.get('Content-Type')).toContain('application/javascript')
    })

    it('should serve Hono JSX runtime at /__cloudwerk/runtime.js', async () => {
      const app = new Hono()
      const tracker = createManifestTracker(tempDir)

      registerHydrationRoutes(app, {
        tracker,
        appDir: tempDir,
        logger: mockLogger,
      })

      const res = await app.request('/__cloudwerk/runtime.js')
      expect(res.status).toBe(200)

      const content = await res.text()
      expect(content).toContain('hono/jsx/dom')
      expect(content).toContain('render')
      expect(content).toContain('useState')
    })

    it('should serve React runtime at /__cloudwerk/react-runtime.js', async () => {
      const app = new Hono()
      const tracker = createManifestTracker(tempDir)

      registerHydrationRoutes(app, {
        tracker,
        appDir: tempDir,
        logger: mockLogger,
        renderer: 'react',
      })

      const res = await app.request('/__cloudwerk/react-runtime.js')
      expect(res.status).toBe(200)

      const content = await res.text()
      expect(content).toContain('react')
      expect(content).toContain('hydrateRoot')
    })

    it('should return 404 for unknown component', async () => {
      const app = new Hono()
      const tracker = createManifestTracker(tempDir)

      registerHydrationRoutes(app, {
        tracker,
        appDir: tempDir,
        logger: mockLogger,
      })

      const res = await app.request('/__cloudwerk/unknown_component.js')
      expect(res.status).toBe(404)

      const content = await res.text()
      expect(content).toContain('Component not found')
    })

    it('should serve component bundle when tracked', async () => {
      // Create a temporary client component file
      const componentPath = path.join(tempDir, 'TestCounter.tsx')
      fs.writeFileSync(
        componentPath,
        `'use client'

import { useState } from 'hono/jsx'

export default function TestCounter() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(c => c + 1)}>Count: {count}</button>
}
`
      )

      try {
        const app = new Hono()
        const tracker = createManifestTracker(tempDir)

        // Track the component
        trackIfClientComponent(tracker, componentPath)

        registerHydrationRoutes(app, {
          tracker,
          appDir: tempDir,
          logger: mockLogger,
        })

        // Get the component bundle
        const res = await app.request('/__cloudwerk/TestCounter.js')
        expect(res.status).toBe(200)
        expect(res.headers.get('Content-Type')).toContain('application/javascript')

        const content = await res.text()
        expect(content).toContain('useState')
      } finally {
        // Cleanup
        if (fs.existsSync(componentPath)) {
          fs.unlinkSync(componentPath)
        }
      }
    })

    it('should cache runtime bundles', async () => {
      const app = new Hono()
      const tracker = createManifestTracker(tempDir)

      registerHydrationRoutes(app, {
        tracker,
        appDir: tempDir,
        logger: mockLogger,
      })

      // Request twice
      const res1 = await app.request('/__cloudwerk/runtime.js')
      const res2 = await app.request('/__cloudwerk/runtime.js')

      const content1 = await res1.text()
      const content2 = await res2.text()

      // Content should be identical (cached)
      expect(content1).toBe(content2)
    })

    it('should log registration in verbose mode', async () => {
      const app = new Hono()
      const tracker = createManifestTracker(tempDir)

      registerHydrationRoutes(app, {
        tracker,
        appDir: tempDir,
        logger: mockLogger,
        verbose: true,
      })

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Registered hydration routes at /__cloudwerk/*'
      )
    })

    it('should set correct cache headers for runtime', async () => {
      const app = new Hono()
      const tracker = createManifestTracker(tempDir)

      registerHydrationRoutes(app, {
        tracker,
        appDir: tempDir,
        logger: mockLogger,
      })

      const res = await app.request('/__cloudwerk/runtime.js')

      // Runtime should have long cache (immutable)
      expect(res.headers.get('Cache-Control')).toContain('max-age=31536000')
      expect(res.headers.get('Cache-Control')).toContain('immutable')
    })

    it('should set no-cache headers for component bundles in dev', async () => {
      // Create a temporary client component file
      const componentPath = path.join(tempDir, 'DevCounter.tsx')
      fs.writeFileSync(
        componentPath,
        `'use client'

import { useState } from 'hono/jsx'

export default function DevCounter() {
  const [count, setCount] = useState(0)
  return <button>Count: {count}</button>
}
`
      )

      try {
        const app = new Hono()
        const tracker = createManifestTracker(tempDir)
        trackIfClientComponent(tracker, componentPath)

        registerHydrationRoutes(app, {
          tracker,
          appDir: tempDir,
          logger: mockLogger,
        })

        const res = await app.request('/__cloudwerk/DevCounter.js')

        // Component bundles should not be cached in dev
        expect(res.headers.get('Cache-Control')).toBe('no-cache')
      } finally {
        if (fs.existsSync(componentPath)) {
          fs.unlinkSync(componentPath)
        }
      }
    })
  })

  describe('clearRuntimeCache', () => {
    it('should clear cached runtimes', async () => {
      const app1 = new Hono()
      const tracker1 = createManifestTracker(tempDir)

      registerHydrationRoutes(app1, {
        tracker: tracker1,
        appDir: tempDir,
        logger: mockLogger,
      })

      // Cache the runtime
      await app1.request('/__cloudwerk/runtime.js')

      // Clear cache
      clearRuntimeCache()

      // Create new app and request again
      const app2 = new Hono()
      const tracker2 = createManifestTracker(tempDir)

      registerHydrationRoutes(app2, {
        tracker: tracker2,
        appDir: tempDir,
        logger: mockLogger,
      })

      const res = await app2.request('/__cloudwerk/runtime.js')
      expect(res.status).toBe(200)
    })
  })
})
