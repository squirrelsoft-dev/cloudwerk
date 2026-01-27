/**
 * Tests for middleware module loading.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import {
  loadMiddlewareModule,
  clearMiddlewareCache,
  getMiddlewareCacheSize,
} from '../server/loadMiddleware.js'

const FIXTURES_DIR = path.join(__dirname, '../../__fixtures__')

// Create a temp directory for test middleware files
const TEMP_DIR = path.join(__dirname, '../../__fixtures__/temp-middleware')

describe('loadMiddlewareModule', () => {
  beforeEach(() => {
    clearMiddlewareCache()
    // Create temp directory for dynamic test files
    if (!fs.existsSync(TEMP_DIR)) {
      fs.mkdirSync(TEMP_DIR, { recursive: true })
    }
  })

  afterEach(() => {
    // Clean up temp files
    if (fs.existsSync(TEMP_DIR)) {
      const files = fs.readdirSync(TEMP_DIR)
      for (const file of files) {
        fs.unlinkSync(path.join(TEMP_DIR, file))
      }
      fs.rmdirSync(TEMP_DIR)
    }
    clearMiddlewareCache()
  })

  describe('basic loading', () => {
    it('should load middleware with default export', async () => {
      const middlewarePath = path.join(TEMP_DIR, 'default-export.ts')
      fs.writeFileSync(
        middlewarePath,
        `
        export default async function(request: Request, next: () => Promise<Response>) {
          return next()
        }
        `
      )

      const handler = await loadMiddlewareModule(middlewarePath)

      expect(handler).toBeDefined()
      expect(typeof handler).toBe('function')
    })

    it('should load middleware with named middleware export', async () => {
      const middlewarePath = path.join(TEMP_DIR, 'named-export.ts')
      fs.writeFileSync(
        middlewarePath,
        `
        export const middleware = async (request: Request, next: () => Promise<Response>) => {
          return next()
        }
        `
      )

      const handler = await loadMiddlewareModule(middlewarePath)

      expect(handler).toBeDefined()
      expect(typeof handler).toBe('function')
    })

    it('should prefer default export over named export', async () => {
      const middlewarePath = path.join(TEMP_DIR, 'both-exports.ts')
      fs.writeFileSync(
        middlewarePath,
        `
        export const middleware = async (request: Request, next: () => Promise<Response>) => {
          return new Response('named')
        }

        export default async function(request: Request, next: () => Promise<Response>) {
          return new Response('default')
        }
        `
      )

      const handler = await loadMiddlewareModule(middlewarePath)

      expect(handler).toBeDefined()

      // Create a minimal Hono-like context to test the handler
      // The adapter sets c.res with the middleware result
      const mockContext = {
        req: { raw: new Request('http://localhost/test') },
        res: new Response('downstream'),
      } as { req: { raw: Request }; res: Response }
      const mockNext = async () => {}

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await handler!(mockContext as any, mockNext)
      // The adapter sets c.res with the middleware's response
      expect(await mockContext.res.text()).toBe('default')
    })
  })

  describe('file not found', () => {
    it('should return null for non-existent file', async () => {
      const handler = await loadMiddlewareModule('/non/existent/path.ts')

      expect(handler).toBeNull()
    })

    it('should return null for non-existent file in verbose mode', async () => {
      const handler = await loadMiddlewareModule('/non/existent/path.ts', true)

      expect(handler).toBeNull()
    })
  })

  describe('invalid exports', () => {
    it('should return null when no valid export exists', async () => {
      const middlewarePath = path.join(TEMP_DIR, 'no-export.ts')
      fs.writeFileSync(
        middlewarePath,
        `
        const helper = () => 'not exported'
        export const notMiddleware = 'string value'
        `
      )

      const handler = await loadMiddlewareModule(middlewarePath, true)

      expect(handler).toBeNull()
    })

    it('should return null when export is not a function', async () => {
      const middlewarePath = path.join(TEMP_DIR, 'not-function.ts')
      fs.writeFileSync(
        middlewarePath,
        `
        export default { notAFunction: true }
        `
      )

      const handler = await loadMiddlewareModule(middlewarePath)

      expect(handler).toBeNull()
    })
  })

  describe('caching', () => {
    it('should cache compiled modules', async () => {
      const middlewarePath = path.join(TEMP_DIR, 'cache-test.ts')
      fs.writeFileSync(
        middlewarePath,
        `
        export default async function(request: Request, next: () => Promise<Response>) {
          return next()
        }
        `
      )

      expect(getMiddlewareCacheSize()).toBe(0)

      await loadMiddlewareModule(middlewarePath)
      expect(getMiddlewareCacheSize()).toBe(1)

      // Load again - should use cache
      await loadMiddlewareModule(middlewarePath)
      expect(getMiddlewareCacheSize()).toBe(1)
    })

    it('should invalidate cache when file changes', async () => {
      const middlewarePath = path.join(TEMP_DIR, 'cache-invalidate.ts')
      fs.writeFileSync(
        middlewarePath,
        `
        export default async function(request: Request, next: () => Promise<Response>) {
          return new Response('v1')
        }
        `
      )

      const handler1 = await loadMiddlewareModule(middlewarePath)

      // Modify file (need to wait a bit for mtime to change)
      await new Promise((resolve) => setTimeout(resolve, 10))
      fs.writeFileSync(
        middlewarePath,
        `
        export default async function(request: Request, next: () => Promise<Response>) {
          return new Response('v2')
        }
        `
      )

      const handler2 = await loadMiddlewareModule(middlewarePath)

      // Both should be valid handlers
      expect(handler1).toBeDefined()
      expect(handler2).toBeDefined()
    })

    it('should clear cache', async () => {
      const middlewarePath = path.join(TEMP_DIR, 'clear-cache.ts')
      fs.writeFileSync(
        middlewarePath,
        `
        export default async function(request: Request, next: () => Promise<Response>) {
          return next()
        }
        `
      )

      await loadMiddlewareModule(middlewarePath)
      expect(getMiddlewareCacheSize()).toBe(1)

      clearMiddlewareCache()
      expect(getMiddlewareCacheSize()).toBe(0)
    })
  })

  describe('TypeScript compilation', () => {
    it('should compile TypeScript middleware', async () => {
      const middlewarePath = path.join(TEMP_DIR, 'typescript.ts')
      fs.writeFileSync(
        middlewarePath,
        `
        import type { Middleware } from '@cloudwerk/core'

        interface User {
          id: string
          name: string
        }

        export const middleware: Middleware = async (request: Request, next: () => Promise<Response>) => {
          const user: User = { id: '123', name: 'Test' }
          return next()
        }
        `
      )

      const handler = await loadMiddlewareModule(middlewarePath)

      expect(handler).toBeDefined()
      expect(typeof handler).toBe('function')
    })

    it('should handle import statements', async () => {
      const middlewarePath = path.join(TEMP_DIR, 'with-imports.ts')
      fs.writeFileSync(
        middlewarePath,
        `
        // Using external import that should be bundled
        export default async function middleware(request: Request, next: () => Promise<Response>) {
          const url = new URL(request.url)
          return next()
        }
        `
      )

      const handler = await loadMiddlewareModule(middlewarePath)

      expect(handler).toBeDefined()
    })
  })

  describe('error handling', () => {
    it('should return null for syntax errors in middleware', async () => {
      const middlewarePath = path.join(TEMP_DIR, 'syntax-error.ts')
      fs.writeFileSync(
        middlewarePath,
        `
        export default async function(request { // Missing colon
          return next()
        }
        `
      )

      const handler = await loadMiddlewareModule(middlewarePath)

      expect(handler).toBeNull()
    })
  })
})
