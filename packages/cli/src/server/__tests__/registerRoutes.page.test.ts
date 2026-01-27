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

  describe('loader functions', () => {
    let app: InstanceType<typeof Hono>
    let logger: ReturnType<typeof createMockLogger>

    beforeEach(async () => {
      app = new Hono()
      logger = createMockLogger()
      const routesDir = path.join(FIXTURES_DIR, 'with-pages/app')
      const manifest = await createManifest(routesDir)
      await registerRoutes(app, manifest, logger)
    })

    describe('page loaders', () => {
      it('should execute loader and pass data to page component', async () => {
        const response = await app.request('http://localhost/users/123')
        const html = await response.text()

        expect(response.status).toBe(200)
        // Verify loader data is passed to component
        expect(html).toContain('Name: User 123')
        expect(html).toContain('Email: user123@example.com')
      })

      it('should handle async loaders correctly', async () => {
        const response = await app.request('http://localhost/posts/test-post')
        const html = await response.text()

        expect(response.status).toBe(200)
        expect(html).toContain('Post: test-post')
        expect(html).toContain('Content for test-post')
      })

      it('should continue working when page has no loader', async () => {
        // Home page has no loader
        const response = await app.request('http://localhost/')
        const html = await response.text()

        expect(response.status).toBe(200)
        expect(html).toContain('Home Page')
      })
    })

    describe('layout loaders', () => {
      it('should execute layout loaders and pass data to layout components', async () => {
        const response = await app.request('http://localhost/users/456')
        const html = await response.text()

        expect(response.status).toBe(200)
        // Verify layout loader data
        expect(html).toContain('data-layout="user"')
        expect(html).toContain('Profile')
        expect(html).toContain('Settings')
        expect(html).toContain('Activity')
      })

      it('should execute layout loaders in parent-to-child order', async () => {
        const response = await app.request('http://localhost/users/789')
        const html = await response.text()

        expect(response.status).toBe(200)
        // Root layout should wrap user layout
        expect(html).toContain('data-layout="root"')
        expect(html).toContain('data-layout="user"')

        // Root layout should come before user layout
        const rootIndex = html.indexOf('data-layout="root"')
        const userIndex = html.indexOf('data-layout="user"')
        expect(rootIndex).toBeLessThan(userIndex)
      })
    })

    describe('NotFoundError handling', () => {
      it('should return 404 when page loader throws NotFoundError', async () => {
        const response = await app.request('http://localhost/not-found-test')

        expect(response.status).toBe(404)
      })

      it('should return 404 when page loader throws NotFoundError for specific params', async () => {
        // User page throws NotFoundError for id '404'
        const response = await app.request('http://localhost/users/404')

        expect(response.status).toBe(404)
      })
    })

    describe('RedirectError handling', () => {
      it('should redirect when loader throws RedirectError (301 permanent)', async () => {
        const response = await app.request('http://localhost/posts/old-post')

        expect(response.status).toBe(301)
        expect(response.headers.get('location')).toBe('/posts/new-post')
      })

      it('should redirect when loader throws RedirectError (302 temporary)', async () => {
        const response = await app.request('http://localhost/posts/maintenance')

        expect(response.status).toBe(302)
        expect(response.headers.get('location')).toBe('/posts/temp-unavailable')
      })
    })

    describe('loader args', () => {
      it('should provide params to loader', async () => {
        const response = await app.request('http://localhost/users/test-user-id')
        const html = await response.text()

        expect(response.status).toBe(200)
        // Loader uses params.id to generate data
        expect(html).toContain('Name: User test-user-id')
        expect(html).toContain('Email: usertest-user-id@example.com')
      })
    })
  })

  describe('action() functions', () => {
    let app: InstanceType<typeof Hono>
    let logger: ReturnType<typeof createMockLogger>

    beforeEach(async () => {
      app = new Hono()
      logger = createMockLogger()
      const routesDir = path.join(FIXTURES_DIR, 'with-pages/app')
      const manifest = await createManifest(routesDir)
      await registerRoutes(app, manifest, logger)
    })

    describe('basic action execution', () => {
      it('should execute POST action and return actionData to page', async () => {
        const formData = new FormData()
        formData.append('intent', 'submit')
        formData.append('message', 'Hello from test!')

        const response = await app.request('http://localhost/action-test', {
          method: 'POST',
          body: formData,
        })

        expect(response.status).toBe(200)
        const html = await response.text()
        expect(html).toContain('data-page="action-test"')
        expect(html).toContain('data-success')
        expect(html).toContain('Hello from test!')
      })

      it('should handle action without request body', async () => {
        const response = await app.request('http://localhost/action-test', {
          method: 'POST',
          body: new FormData(),
        })

        expect(response.status).toBe(200)
        const html = await response.text()
        expect(html).toContain('No message provided')
      })

      it('should return actionData with validation errors', async () => {
        const formData = new FormData()
        formData.append('intent', 'error')

        const response = await app.request('http://localhost/action-test', {
          method: 'POST',
          body: formData,
        })

        expect(response.status).toBe(200)
        const html = await response.text()
        expect(html).toContain('data-error')
        expect(html).toContain('validation error')
      })
    })

    describe('response handling', () => {
      it('should return Response directly when action returns redirect()', async () => {
        const formData = new FormData()
        formData.append('intent', 'redirect')

        const response = await app.request('http://localhost/action-test', {
          method: 'POST',
          body: formData,
        })

        expect(response.status).toBe(302)
        expect(response.headers.get('location')).toBe('/action-test?redirected=true')
      })

      it('should re-render page with actionData when action returns data', async () => {
        const formData = new FormData()
        formData.append('intent', 'submit')
        formData.append('message', 'Test message')

        const response = await app.request('http://localhost/action-test', {
          method: 'POST',
          body: formData,
        })

        expect(response.status).toBe(200)
        expect(response.headers.get('content-type')).toContain('text/html')

        const html = await response.text()
        // Verify loader data is present (action re-runs loader)
        expect(html).toContain('Submit the form to test actions')
        // Verify actionData is present
        expect(html).toContain('data-success')
        expect(html).toContain('Test message')
      })

      it('should re-run loader after action returns data (not Response)', async () => {
        const formData = new FormData()
        formData.append('intent', 'submit')
        formData.append('message', 'Loader test')

        const response = await app.request('http://localhost/action-test', {
          method: 'POST',
          body: formData,
        })

        expect(response.status).toBe(200)
        const html = await response.text()
        // Loader message should be present (loader was re-run)
        expect(html).toContain('data-loader-message')
        expect(html).toContain('Submit the form to test actions')
      })
    })

    describe('named method exports', () => {
      it('should support POST named export', async () => {
        const formData = new FormData()
        formData.append('name', 'New Item')
        formData.append('intent', 'create')

        const response = await app.request('http://localhost/action-methods', {
          method: 'POST',
          body: formData,
        })

        expect(response.status).toBe(200)
        const html = await response.text()
        expect(html).toContain('Method: POST')
        expect(html).toContain('Action: create')
        expect(html).toContain('Item Name: New Item')
      })

      it('should support DELETE named export', async () => {
        const formData = new FormData()
        formData.append('itemId', '123')

        const response = await app.request('http://localhost/action-methods', {
          method: 'DELETE',
          body: formData,
        })

        expect(response.status).toBe(200)
        const html = await response.text()
        expect(html).toContain('Method: DELETE')
        expect(html).toContain('Action: delete')
        expect(html).toContain('Item ID: 123')
        expect(html).toContain('Item deleted!')
      })

      it('should support PUT named export', async () => {
        const formData = new FormData()
        formData.append('itemId', '456')
        formData.append('name', 'Updated Item')

        const response = await app.request('http://localhost/action-methods', {
          method: 'PUT',
          body: formData,
        })

        expect(response.status).toBe(200)
        const html = await response.text()
        expect(html).toContain('Method: PUT')
        expect(html).toContain('Action: update')
        expect(html).toContain('Item ID: 456')
        expect(html).toContain('Item Name: Updated Item')
      })

      it('should support PATCH named export', async () => {
        const formData = new FormData()
        formData.append('itemId', '789')
        formData.append('field', 'status')

        const response = await app.request('http://localhost/action-methods', {
          method: 'PATCH',
          body: formData,
        })

        expect(response.status).toBe(200)
        const html = await response.text()
        expect(html).toContain('Method: PATCH')
        expect(html).toContain('Action: patch-status')
        expect(html).toContain('Item ID: 789')
      })

      it('should register all mutation methods when action exists', async () => {
        // Verify each method is registered by making requests
        const methods = ['POST', 'DELETE', 'PUT', 'PATCH'] as const

        for (const method of methods) {
          const formData = new FormData()
          formData.append('test', 'value')

          const response = await app.request('http://localhost/action-methods', {
            method,
            body: formData,
          })

          // All should succeed (200) because handlers are registered
          expect(response.status).toBe(200)
          const html = await response.text()
          expect(html).toContain(`Method: ${method}`)
        }
      })
    })

    describe('error handling in actions', () => {
      it('should return 404 when action throws NotFoundError', async () => {
        const formData = new FormData()
        formData.append('intent', 'notfound')

        const response = await app.request('http://localhost/action-methods', {
          method: 'POST',
          body: formData,
        })

        expect(response.status).toBe(404)
      })

      it('should redirect when action throws RedirectError', async () => {
        const formData = new FormData()
        formData.append('intent', 'redirect-error')

        const response = await app.request('http://localhost/action-methods', {
          method: 'POST',
          body: formData,
        })

        expect(response.status).toBe(302)
        expect(response.headers.get('location')).toBe('/action-methods?redirect-error=true')
      })
    })

    describe('integration with loader', () => {
      it('should pass both loaderData and actionData to page', async () => {
        const formData = new FormData()
        formData.append('name', 'Test Item')
        formData.append('intent', 'create')

        const response = await app.request('http://localhost/action-methods', {
          method: 'POST',
          body: formData,
        })

        expect(response.status).toBe(200)
        const html = await response.text()

        // Verify loader data is present (items list)
        expect(html).toContain('Item One')
        expect(html).toContain('Item Two')
        expect(html).toContain('Item Three')

        // Verify actionData is present
        expect(html).toContain('Method: POST')
        expect(html).toContain('Item Name: Test Item')
      })

      it('should have actionData undefined on GET requests', async () => {
        const response = await app.request('http://localhost/action-test')

        expect(response.status).toBe(200)
        const html = await response.text()

        // Page should render without actionData-related content
        expect(html).not.toContain('data-success')
        expect(html).not.toContain('data-error')
        expect(html).not.toContain('data-redirected')

        // Loader data should be present
        expect(html).toContain('Submit the form to test actions')
      })
    })

    describe('preference for named exports over generic action', () => {
      it('should use POST export instead of action when both exist', async () => {
        // The action-methods page has named exports, not a generic action
        // This verifies the named export is used
        const formData = new FormData()
        formData.append('name', 'Via POST export')
        formData.append('intent', 'create')

        const response = await app.request('http://localhost/action-methods', {
          method: 'POST',
          body: formData,
        })

        expect(response.status).toBe(200)
        const html = await response.text()
        expect(html).toContain('Method: POST')
        expect(html).toContain('Via POST export')
      })
    })
  })
})
