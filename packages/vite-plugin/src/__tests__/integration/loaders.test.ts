/**
 * Integration Tests: Loaders
 *
 * Tests page loaders, layout loaders, and params/searchParams passing.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createTestServer, type TestServer } from './test-utils.js'

describe('Loaders', () => {
  let server: TestServer

  beforeAll(async () => {
    server = await createTestServer('loaders-app')
  })

  afterAll(async () => {
    await server.close()
  })

  describe('page loaders', () => {
    it('should load data and pass to page component', async () => {
      const response = await server.fetch('/')
      expect(response.status).toBe(200)

      const html = await response.text()
      expect(html).toContain('data-testid="home-page"')
      expect(html).toContain('Hello, Guest!')
    })

    it('should pass searchParams to loader', async () => {
      const response = await server.fetch('/?name=Alice')
      expect(response.status).toBe(200)

      const html = await response.text()
      expect(html).toContain('Hello, Alice!')
    })

    it('should pass searchParams to page component', async () => {
      const response = await server.fetch('/?name=Bob&debug=true')
      expect(response.status).toBe(200)

      const html = await response.text()
      expect(html).toContain('data-testid="search-params"')
      expect(html).toContain('name')
      expect(html).toContain('debug')
    })
  })

  describe('params passing', () => {
    it('should pass params to loader for dynamic routes', async () => {
      const response = await server.fetch('/users/1')
      expect(response.status).toBe(200)

      const html = await response.text()
      expect(html).toContain('data-testid="user-page"')
      expect(html).toContain('Alice')
      expect(html).toContain('alice@example.com')
    })

    it('should handle different param values', async () => {
      const response = await server.fetch('/users/2')
      expect(response.status).toBe(200)

      const html = await response.text()
      expect(html).toContain('Bob')
      expect(html).toContain('bob@example.com')
    })

    it('should handle non-existent user (loader returns null)', async () => {
      const response = await server.fetch('/users/999')
      expect(response.status).toBe(200)

      const html = await response.text()
      expect(html).toContain('data-testid="user-not-found"')
      expect(html).toContain('User with ID 999 does not exist')
    })
  })

  describe('layout loaders', () => {
    it('should load data from layout loader and pass to layout', async () => {
      const response = await server.fetch('/')
      const html = await response.text()

      expect(html).toContain('data-testid="app-name"')
      expect(html).toContain('Loaders Test App')
    })

    it('should execute layout loader for nested routes', async () => {
      const response = await server.fetch('/users/1')
      const html = await response.text()

      // Layout data should still be present on nested routes
      expect(html).toContain('data-testid="app-name"')
      expect(html).toContain('Loaders Test App')
    })
  })
})
