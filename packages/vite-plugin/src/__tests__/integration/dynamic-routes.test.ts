/**
 * Integration Tests: Dynamic Routes
 *
 * Tests dynamic route segments: [id], [...slug], [[...cat]] patterns.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createTestServer, type TestServer } from './test-utils.js'

describe('Dynamic Routes', () => {
  let server: TestServer

  beforeAll(async () => {
    server = await createTestServer('dynamic-routes')
  })

  afterAll(async () => {
    await server.close()
  })

  describe('[id] - single dynamic segment', () => {
    it('should render user page with ID param', async () => {
      const response = await server.fetch('/users/123')
      expect(response.status).toBe(200)

      const html = await response.text()
      expect(html).toContain('data-testid="user-page"')
      expect(html).toContain('User ID: 123')
    })

    it('should handle different ID values', async () => {
      const response = await server.fetch('/users/abc-456')
      expect(response.status).toBe(200)

      const html = await response.text()
      expect(html).toContain('User ID: abc-456')
    })
  })

  describe('[...slug] - catch-all segment', () => {
    it('should render docs page with single slug segment', async () => {
      const response = await server.fetch('/docs/getting-started')
      expect(response.status).toBe(200)

      const html = await response.text()
      expect(html).toContain('data-testid="docs-page"')
      expect(html).toContain('Slug: getting-started')
    })

    it('should render docs page with multi-segment slug', async () => {
      const response = await server.fetch('/docs/api/reference/routes')
      expect(response.status).toBe(200)

      const html = await response.text()
      expect(html).toContain('Slug: api/reference/routes')
    })

    it('should return 404 for /docs without slug (required catch-all)', async () => {
      const response = await server.fetch('/docs')
      expect(response.status).toBe(404)
    })
  })

  describe('[[...cat]] - optional catch-all segment', () => {
    it('should render shop page without category (base path)', async () => {
      const response = await server.fetch('/shop')
      expect(response.status).toBe(200)

      const html = await response.text()
      expect(html).toContain('data-testid="shop-page"')
      expect(html).toContain('Category: All Products')
    })

    it('should render shop page with single category', async () => {
      const response = await server.fetch('/shop/electronics')
      expect(response.status).toBe(200)

      const html = await response.text()
      expect(html).toContain('Category: electronics')
    })

    it('should render shop page with nested categories', async () => {
      const response = await server.fetch('/shop/electronics/phones/android')
      expect(response.status).toBe(200)

      const html = await response.text()
      expect(html).toContain('Category: electronics/phones/android')
    })
  })
})
