/**
 * Integration Tests: Middleware
 *
 * Tests middleware chains, root middleware, and nested middleware.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createTestServer, type TestServer } from './test-utils.js'

describe('Middleware', () => {
  let server: TestServer

  beforeAll(async () => {
    server = await createTestServer('middleware-app')
  })

  afterAll(async () => {
    await server?.close()
  })

  describe('root middleware', () => {
    it('should apply root middleware to home page', async () => {
      const response = await server.fetch('/')
      expect(response.status).toBe(200)
      expect(response.headers.get('X-Root-Middleware')).toBe('executed')
    })

    it('should apply root middleware to admin page', async () => {
      const response = await server.fetch('/admin')
      expect(response.status).toBe(200)
      expect(response.headers.get('X-Root-Middleware')).toBe('executed')
    })
  })

  describe('nested middleware chains', () => {
    it('should apply both root and admin middleware to admin page', async () => {
      const response = await server.fetch('/admin')
      expect(response.status).toBe(200)

      // Both middleware should have run
      expect(response.headers.get('X-Root-Middleware')).toBe('executed')
      expect(response.headers.get('X-Admin-Middleware')).toBe('executed')
    })

    it('should not apply admin middleware to home page', async () => {
      const response = await server.fetch('/')
      expect(response.status).toBe(200)

      expect(response.headers.get('X-Root-Middleware')).toBe('executed')
      expect(response.headers.get('X-Admin-Middleware')).toBeNull()
    })
  })
})
