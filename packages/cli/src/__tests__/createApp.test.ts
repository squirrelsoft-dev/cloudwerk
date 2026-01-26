/**
 * Tests for Hono app creation.
 */

import { describe, it, expect, vi } from 'vitest'
import * as path from 'node:path'
import {
  scanRoutes,
  buildRouteManifest,
  resolveLayouts,
  resolveMiddleware,
  DEFAULT_CONFIG,
} from '@cloudwerk/core'
import { createApp } from '../server/createApp.js'
import { createLogger } from '../utils/logger.js'

const FIXTURES_DIR = path.join(__dirname, '../../__fixtures__')

describe('createApp', () => {
  const logger = createLogger(false)

  describe('basic-app fixture', () => {
    it('should create app with registered routes', async () => {
      const routesDir = path.join(FIXTURES_DIR, 'basic-app/app')
      const scanResult = await scanRoutes(routesDir, { extensions: ['.ts', '.tsx'] })

      const manifest = buildRouteManifest(
        scanResult,
        routesDir,
        resolveLayouts,
        resolveMiddleware
      )

      const { app, routes } = await createApp(manifest, DEFAULT_CONFIG, logger)

      expect(app).toBeDefined()
      expect(routes.length).toBeGreaterThan(0)

      // Check that expected routes are registered
      const routePatterns = routes.map((r) => `${r.method} ${r.pattern}`)
      expect(routePatterns).toContain('GET /api/health')
      expect(routePatterns).toContain('GET /api/users')
      expect(routePatterns).toContain('POST /api/users')
    })

    it('should handle GET /api/health request', async () => {
      const routesDir = path.join(FIXTURES_DIR, 'basic-app/app')
      const scanResult = await scanRoutes(routesDir, { extensions: ['.ts', '.tsx'] })

      const manifest = buildRouteManifest(
        scanResult,
        routesDir,
        resolveLayouts,
        resolveMiddleware
      )

      const { app } = await createApp(manifest, DEFAULT_CONFIG, logger)

      // Make a request to the app
      const request = new Request('http://localhost/api/health')
      const response = await app.fetch(request)

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.status).toBe('ok')
      expect(data.timestamp).toBeDefined()
    })

    it('should handle GET /api/users request', async () => {
      const routesDir = path.join(FIXTURES_DIR, 'basic-app/app')
      const scanResult = await scanRoutes(routesDir, { extensions: ['.ts', '.tsx'] })

      const manifest = buildRouteManifest(
        scanResult,
        routesDir,
        resolveLayouts,
        resolveMiddleware
      )

      const { app } = await createApp(manifest, DEFAULT_CONFIG, logger)

      const request = new Request('http://localhost/api/users')
      const response = await app.fetch(request)

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.users).toBeDefined()
      expect(Array.isArray(data.users)).toBe(true)
    })

    it('should handle POST /api/users request', async () => {
      const routesDir = path.join(FIXTURES_DIR, 'basic-app/app')
      const scanResult = await scanRoutes(routesDir, { extensions: ['.ts', '.tsx'] })

      const manifest = buildRouteManifest(
        scanResult,
        routesDir,
        resolveLayouts,
        resolveMiddleware
      )

      const { app } = await createApp(manifest, DEFAULT_CONFIG, logger)

      const request = new Request('http://localhost/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Charlie' }),
      })
      const response = await app.fetch(request)

      expect(response.status).toBe(201)

      const data = await response.json()
      expect(data.name).toBe('Charlie')
      expect(data.id).toBeDefined()
    })

    it('should return 404 for unknown routes', async () => {
      const routesDir = path.join(FIXTURES_DIR, 'basic-app/app')
      const scanResult = await scanRoutes(routesDir, { extensions: ['.ts', '.tsx'] })

      const manifest = buildRouteManifest(
        scanResult,
        routesDir,
        resolveLayouts,
        resolveMiddleware
      )

      const { app } = await createApp(manifest, DEFAULT_CONFIG, logger)

      const request = new Request('http://localhost/api/unknown')
      const response = await app.fetch(request)

      expect(response.status).toBe(404)

      const data = await response.json()
      expect(data.error).toBe('Not Found')
    })
  })

  describe('with-dynamic-routes fixture', () => {
    it('should register dynamic routes', async () => {
      const routesDir = path.join(FIXTURES_DIR, 'with-dynamic-routes/app')
      const scanResult = await scanRoutes(routesDir, { extensions: ['.ts', '.tsx'] })

      const manifest = buildRouteManifest(
        scanResult,
        routesDir,
        resolveLayouts,
        resolveMiddleware
      )

      const { app, routes } = await createApp(manifest, DEFAULT_CONFIG, logger)

      expect(app).toBeDefined()

      // Check that dynamic routes are registered
      const routePatterns = routes.map((r) => `${r.method} ${r.pattern}`)
      expect(routePatterns).toContain('GET /api/users')
      expect(routePatterns).toContain('GET /api/users/:id')
      expect(routePatterns).toContain('PUT /api/users/:id')
      expect(routePatterns).toContain('DELETE /api/users/:id')
    })

    it('should handle GET /api/users/:id request', async () => {
      const routesDir = path.join(FIXTURES_DIR, 'with-dynamic-routes/app')
      const scanResult = await scanRoutes(routesDir, { extensions: ['.ts', '.tsx'] })

      const manifest = buildRouteManifest(
        scanResult,
        routesDir,
        resolveLayouts,
        resolveMiddleware
      )

      const { app } = await createApp(manifest, DEFAULT_CONFIG, logger)

      const request = new Request('http://localhost/api/users/1')
      const response = await app.fetch(request)

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.user).toBeDefined()
      expect(data.user.id).toBe('1')
      expect(data.user.name).toBe('Alice')
    })

    it('should handle PUT /api/users/:id request', async () => {
      const routesDir = path.join(FIXTURES_DIR, 'with-dynamic-routes/app')
      const scanResult = await scanRoutes(routesDir, { extensions: ['.ts', '.tsx'] })

      const manifest = buildRouteManifest(
        scanResult,
        routesDir,
        resolveLayouts,
        resolveMiddleware
      )

      const { app } = await createApp(manifest, DEFAULT_CONFIG, logger)

      const request = new Request('http://localhost/api/users/2', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Bob Updated' }),
      })
      const response = await app.fetch(request)

      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.user.name).toBe('Bob Updated')
    })

    it('should handle DELETE /api/users/:id request', async () => {
      const routesDir = path.join(FIXTURES_DIR, 'with-dynamic-routes/app')
      const scanResult = await scanRoutes(routesDir, { extensions: ['.ts', '.tsx'] })

      const manifest = buildRouteManifest(
        scanResult,
        routesDir,
        resolveLayouts,
        resolveMiddleware
      )

      const { app } = await createApp(manifest, DEFAULT_CONFIG, logger)

      const request = new Request('http://localhost/api/users/3', {
        method: 'DELETE',
      })
      const response = await app.fetch(request)

      expect(response.status).toBe(204)
    })

    it('should return 404 for non-existent user', async () => {
      const routesDir = path.join(FIXTURES_DIR, 'with-dynamic-routes/app')
      const scanResult = await scanRoutes(routesDir, { extensions: ['.ts', '.tsx'] })

      const manifest = buildRouteManifest(
        scanResult,
        routesDir,
        resolveLayouts,
        resolveMiddleware
      )

      const { app } = await createApp(manifest, DEFAULT_CONFIG, logger)

      const request = new Request('http://localhost/api/users/999')
      const response = await app.fetch(request)

      expect(response.status).toBe(404)

      const data = await response.json()
      expect(data.error).toBe('User not found')
    })
  })

  describe('verbose mode', () => {
    it('should enable request logging in verbose mode', async () => {
      const routesDir = path.join(FIXTURES_DIR, 'basic-app/app')
      const scanResult = await scanRoutes(routesDir, { extensions: ['.ts', '.tsx'] })

      const manifest = buildRouteManifest(
        scanResult,
        routesDir,
        resolveLayouts,
        resolveMiddleware
      )

      // Create app in verbose mode
      const { app } = await createApp(manifest, DEFAULT_CONFIG, logger, true)

      expect(app).toBeDefined()

      // Request should still work with verbose mode
      const request = new Request('http://localhost/api/health')
      const response = await app.fetch(request)

      expect(response.status).toBe(200)
    })
  })
})
