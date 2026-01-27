/**
 * Tests for route handler loading.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import * as path from 'node:path'
import { loadRouteHandler, clearModuleCache } from '../server/loadHandler.js'

const FIXTURES_DIR = path.join(__dirname, '../../__fixtures__')

describe('loadRouteHandler', () => {
  beforeEach(() => {
    clearModuleCache()
  })

  describe('basic-app fixture', () => {
    it('should load a route with GET export', async () => {
      const routePath = path.join(FIXTURES_DIR, 'basic-app/app/api/health/route.ts')
      const module = await loadRouteHandler(routePath)

      expect(module).toBeDefined()
      expect(typeof module.GET).toBe('function')
    })

    it('should load a route with multiple HTTP method exports', async () => {
      const routePath = path.join(FIXTURES_DIR, 'basic-app/app/api/users/route.ts')
      const module = await loadRouteHandler(routePath)

      expect(module).toBeDefined()
      expect(typeof module.GET).toBe('function')
      expect(typeof module.POST).toBe('function')
      expect(module.PUT).toBeUndefined()
      expect(module.DELETE).toBeUndefined()
    })

    it('should execute GET handler and return response', async () => {
      const routePath = path.join(FIXTURES_DIR, 'basic-app/app/api/health/route.ts')
      const module = await loadRouteHandler(routePath)

      // Create a mock context
      const mockContext = {
        json: (data: unknown, status?: number) => {
          return new Response(JSON.stringify(data), {
            status: status ?? 200,
            headers: { 'Content-Type': 'application/json' },
          })
        },
      }

      const response = await module.GET!(mockContext)
      expect(response).toBeInstanceOf(Response)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.status).toBe('ok')
      expect(data.timestamp).toBeDefined()
    })
  })

  describe('with-dynamic-routes fixture', () => {
    it('should load route with dynamic parameter handlers', async () => {
      const routePath = path.join(FIXTURES_DIR, 'with-dynamic-routes/app/api/users/[id]/route.ts')
      const module = await loadRouteHandler(routePath)

      expect(module).toBeDefined()
      expect(typeof module.GET).toBe('function')
      expect(typeof module.PUT).toBe('function')
      expect(typeof module.DELETE).toBe('function')
      expect(module.POST).toBeUndefined()
    })

    it('should execute GET handler with param extraction (Cloudwerk signature)', async () => {
      const routePath = path.join(FIXTURES_DIR, 'with-dynamic-routes/app/api/users/[id]/route.ts')
      const module = await loadRouteHandler(routePath)

      // This fixture uses the Cloudwerk-native handler signature (arity 2)
      // Handler signature: (request: Request, context: { params }) => Response
      const request = new Request('http://localhost/api/users/1')
      const context = { params: { id: '1' } }

      const response = await module.GET!(request, context)
      expect(response).toBeInstanceOf(Response)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.user).toBeDefined()
      expect(data.user.id).toBe('1')
      expect(data.user.name).toBe('Alice')
    })

    it('should return 404 for non-existent user (Cloudwerk signature)', async () => {
      const routePath = path.join(FIXTURES_DIR, 'with-dynamic-routes/app/api/users/[id]/route.ts')
      const module = await loadRouteHandler(routePath)

      // This fixture uses the Cloudwerk-native handler signature (arity 2)
      const request = new Request('http://localhost/api/users/999')
      const context = { params: { id: '999' } }

      const response = await module.GET!(request, context)
      expect(response.status).toBe(404)

      const data = await response.json()
      expect(data.error).toBe('User not found')
    })
  })

  describe('error handling', () => {
    it('should throw for non-existent file', async () => {
      const routePath = path.join(FIXTURES_DIR, 'does-not-exist/route.ts')

      await expect(loadRouteHandler(routePath)).rejects.toThrow()
    })
  })
})
