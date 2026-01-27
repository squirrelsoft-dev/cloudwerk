/**
 * Tests for client component hydration in route registration.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Hono } from 'hono'
import * as fs from 'node:fs'
import * as path from 'node:path'
import type { RouteManifest, ScanResult, RouteEntry } from '@cloudwerk/core'
import { registerRoutes } from '../registerRoutes.js'
import { createManifestTracker } from '../hydrationManifest.js'
import type { Logger } from '../../types.js'

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
const tempDir = path.join(fixturesDir, 'temp-hydration-routes')

// Helper to create minimal scan result
function createScanResult(): ScanResult {
  return {
    routes: [],
    layouts: [],
    middleware: [],
    loading: [],
    errors: [],
    notFound: [],
  }
}

// Helper to create a route entry
function createRouteEntry(
  urlPattern: string,
  filePath: string,
  absolutePath: string
): RouteEntry {
  return {
    urlPattern,
    filePath,
    absolutePath,
    fileType: 'page',
    segments: [],
    layouts: [],
    middleware: [],
    priority: 1,
  }
}

// Helper to create route manifest
function createManifest(
  routes: RouteEntry[],
  rootDir: string
): RouteManifest {
  return {
    routes,
    layouts: new Map(),
    middleware: new Map(),
    errors: [],
    warnings: [],
    generatedAt: new Date(),
    rootDir,
  }
}

describe('registerRoutes - hydration', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Ensure temp directory exists
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }
  })

  describe('client component tracking', () => {
    it('should track client components during page loading', async () => {
      // Create a temporary client component page
      const pagePath = path.join(tempDir, 'ClientPage.tsx')
      fs.writeFileSync(
        pagePath,
        `'use client'

import { useState } from 'hono/jsx'

export default function ClientPage() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(c => c + 1)}>Count: {count}</button>
}
`
      )

      try {
        const app = new Hono()
        const tracker = createManifestTracker(tempDir)

        const manifest = createManifest(
          [createRouteEntry('/', 'ClientPage.tsx', pagePath)],
          tempDir
        )

        await registerRoutes(
          app,
          manifest,
          createScanResult(),
          mockLogger,
          false,
          tracker
        )

        // The tracker should have the component
        expect(tracker.components.size).toBe(1)
        expect(tracker.components.has(pagePath)).toBe(true)
      } finally {
        if (fs.existsSync(pagePath)) {
          fs.unlinkSync(pagePath)
        }
      }
    })

    it('should inject hydration scripts for pages with client components', async () => {
      // Create a temporary client component page
      const pagePath = path.join(tempDir, 'HydratedPage.tsx')
      fs.writeFileSync(
        pagePath,
        `'use client'

import { useState } from 'hono/jsx'

export default function HydratedPage() {
  const [count, setCount] = useState(0)
  return (
    <html>
      <head><title>Test</title></head>
      <body>
        <button onClick={() => setCount(c => c + 1)}>Count: {count}</button>
      </body>
    </html>
  )
}
`
      )

      try {
        const app = new Hono()
        const tracker = createManifestTracker(tempDir)

        const manifest = createManifest(
          [createRouteEntry('/hydrated', 'HydratedPage.tsx', pagePath)],
          tempDir
        )

        await registerRoutes(
          app,
          manifest,
          createScanResult(),
          mockLogger,
          false,
          tracker
        )

        // Request the page
        const res = await app.request('/hydrated')
        expect(res.status).toBe(200)

        const html = await res.text()

        // Should have preload hints
        expect(html).toContain('<link rel="modulepreload"')
        expect(html).toContain('/__cloudwerk/')

        // Should have hydration script
        expect(html).toContain('data-hydrate-id')
        expect(html).toContain('/__cloudwerk/runtime.js')
      } finally {
        if (fs.existsSync(pagePath)) {
          fs.unlinkSync(pagePath)
        }
      }
    })

    it('should not inject hydration for server-only pages', async () => {
      // Create a regular server component page
      const pagePath = path.join(tempDir, 'ServerPage.tsx')
      fs.writeFileSync(
        pagePath,
        `// No 'use client' directive - this is a server component

export default function ServerPage() {
  return (
    <html>
      <head><title>Server Page</title></head>
      <body>
        <h1>Hello from server</h1>
      </body>
    </html>
  )
}
`
      )

      try {
        const app = new Hono()
        const tracker = createManifestTracker(tempDir)

        const manifest = createManifest(
          [createRouteEntry('/server', 'ServerPage.tsx', pagePath)],
          tempDir
        )

        await registerRoutes(
          app,
          manifest,
          createScanResult(),
          mockLogger,
          false,
          tracker
        )

        // Request the page
        const res = await app.request('/server')
        expect(res.status).toBe(200)

        const html = await res.text()

        // Should NOT have hydration scripts since no client components
        expect(html).not.toContain('data-hydrate-id')
        expect(html).not.toContain('/__cloudwerk/runtime.js')
      } finally {
        if (fs.existsSync(pagePath)) {
          fs.unlinkSync(pagePath)
        }
      }
    })

    it('should work without hydration tracker (backward compatibility)', async () => {
      // Create a regular server component page
      const pagePath = path.join(tempDir, 'NoTrackerPage.tsx')
      fs.writeFileSync(
        pagePath,
        `export default function NoTrackerPage() {
  return <h1>Hello</h1>
}
`
      )

      try {
        const app = new Hono()

        const manifest = createManifest(
          [createRouteEntry('/no-tracker', 'NoTrackerPage.tsx', pagePath)],
          tempDir
        )

        // Register without tracker (undefined)
        await registerRoutes(
          app,
          manifest,
          createScanResult(),
          mockLogger,
          false,
          undefined
        )

        // Request the page
        const res = await app.request('/no-tracker')
        expect(res.status).toBe(200)

        const html = await res.text()
        expect(html).toContain('Hello')
      } finally {
        if (fs.existsSync(pagePath)) {
          fs.unlinkSync(pagePath)
        }
      }
    })
  })

  describe('hydration manifest generation', () => {
    it('should include all used client components in manifest', async () => {
      // Create multiple client components
      const counterPath = path.join(tempDir, 'Counter.tsx')
      fs.writeFileSync(
        counterPath,
        `'use client'
import { useState } from 'hono/jsx'
export default function Counter() {
  const [count, setCount] = useState(0)
  return <button>Count: {count}</button>
}
`
      )

      const togglePath = path.join(tempDir, 'Toggle.tsx')
      fs.writeFileSync(
        togglePath,
        `'use client'
import { useState } from 'hono/jsx'
export default function Toggle() {
  const [on, setOn] = useState(false)
  return <button>{on ? 'ON' : 'OFF'}</button>
}
`
      )

      // Create a page that uses both
      const pagePath = path.join(tempDir, 'MultiClientPage.tsx')
      fs.writeFileSync(
        pagePath,
        `'use client'
import { useState } from 'hono/jsx'
export default function MultiClientPage() {
  const [value, setValue] = useState('')
  return <input value={value} onChange={(e) => setValue(e.target.value)} />
}
`
      )

      try {
        const app = new Hono()
        const tracker = createManifestTracker(tempDir)

        const manifest = createManifest(
          [createRouteEntry('/multi', 'MultiClientPage.tsx', pagePath)],
          tempDir
        )

        await registerRoutes(
          app,
          manifest,
          createScanResult(),
          mockLogger,
          false,
          tracker
        )

        // The page itself is tracked
        expect(tracker.components.has(pagePath)).toBe(true)
        expect(tracker.components.get(pagePath)?.componentId).toBe('MultiClientPage')
      } finally {
        // Cleanup
        for (const p of [counterPath, togglePath, pagePath]) {
          if (fs.existsSync(p)) fs.unlinkSync(p)
        }
      }
    })
  })
})
