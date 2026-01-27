/**
 * Tests for route handler loading with config exports.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import * as path from 'node:path'
import { loadRouteHandler, clearModuleCache } from '../loadHandler.js'

const FIXTURES_DIR = path.join(__dirname, '../../../__fixtures__')

describe('loadRouteHandler - config support', () => {
  beforeEach(() => {
    clearModuleCache()
  })

  describe('with-config fixture', () => {
    it('should extract config export from route file', async () => {
      const routePath = path.join(FIXTURES_DIR, 'with-config/app/api/protected/route.ts')
      const module = await loadRouteHandler(routePath)

      expect(module).toBeDefined()
      expect(module.config).toBeDefined()
      expect(module.config?.auth).toBe('required')
      expect(module.config?.rateLimit).toBe('100/1m')
      expect(module.config?.cache).toBe('private')
    })

    it('should preserve custom metadata in config', async () => {
      const routePath = path.join(FIXTURES_DIR, 'with-config/app/api/protected/route.ts')
      const module = await loadRouteHandler(routePath)

      expect(module.config?.customMeta).toEqual({ role: 'admin' })
    })

    it('should still load HTTP method handlers alongside config', async () => {
      const routePath = path.join(FIXTURES_DIR, 'with-config/app/api/protected/route.ts')
      const module = await loadRouteHandler(routePath)

      expect(typeof module.GET).toBe('function')
      expect(typeof module.POST).toBe('function')
      expect(module.PUT).toBeUndefined()
    })

    it('should execute handlers from routes with config', async () => {
      const routePath = path.join(FIXTURES_DIR, 'with-config/app/api/protected/route.ts')
      const module = await loadRouteHandler(routePath)

      const request = new Request('http://localhost/api/protected')
      const context = { params: {} }

      const response = await module.GET!(request, context)
      expect(response).toBeInstanceOf(Response)
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.message).toBe('Protected resource')
    })

    it('should return undefined config for routes without config export', async () => {
      const routePath = path.join(FIXTURES_DIR, 'with-config/app/api/public/route.ts')
      const module = await loadRouteHandler(routePath)

      expect(module).toBeDefined()
      expect(typeof module.GET).toBe('function')
      expect(module.config).toBeUndefined()
    })

    it('should validate config and throw for invalid values', async () => {
      const routePath = path.join(FIXTURES_DIR, 'with-config/app/api/invalid-config/route.ts')

      await expect(loadRouteHandler(routePath)).rejects.toThrow(
        "auth must be 'required', 'optional', or 'none'"
      )
    })
  })

  describe('routes without config', () => {
    it('should work normally for basic-app routes without config', async () => {
      const routePath = path.join(FIXTURES_DIR, 'basic-app/app/api/health/route.ts')
      const module = await loadRouteHandler(routePath)

      expect(module).toBeDefined()
      expect(typeof module.GET).toBe('function')
      expect(module.config).toBeUndefined()
    })

    it('should work normally for dynamic routes without config', async () => {
      const routePath = path.join(FIXTURES_DIR, 'with-dynamic-routes/app/api/users/[id]/route.ts')
      const module = await loadRouteHandler(routePath)

      expect(module).toBeDefined()
      expect(typeof module.GET).toBe('function')
      expect(typeof module.PUT).toBe('function')
      expect(typeof module.DELETE).toBe('function')
      expect(module.config).toBeUndefined()
    })
  })

  describe('config caching', () => {
    it('should cache config along with module', async () => {
      const routePath = path.join(FIXTURES_DIR, 'with-config/app/api/protected/route.ts')

      // First load
      const module1 = await loadRouteHandler(routePath)
      const config1 = module1.config

      // Second load (from cache)
      const module2 = await loadRouteHandler(routePath)
      const config2 = module2.config

      // Should be same object from cache
      expect(config1).toBe(config2)
    })
  })
})
