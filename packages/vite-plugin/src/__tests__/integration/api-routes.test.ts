/**
 * Integration Tests: API Routes
 *
 * Tests API route handlers, HTTP methods, and JSON responses.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createTestServer, type TestServer } from './test-utils.js'

describe('API Routes', () => {
  let server: TestServer

  beforeAll(async () => {
    server = await createTestServer('basic-app')
  })

  afterAll(async () => {
    await server.close()
  })

  describe('GET handlers', () => {
    it('should handle GET requests to /api/health', async () => {
      const response = await server.fetch('/api/health')
      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toContain('application/json')

      const data = await response.json()
      expect(data.status).toBe('ok')
      expect(data.timestamp).toBeDefined()
    })
  })

  describe('POST handlers', () => {
    it('should handle POST requests to /api/health', async () => {
      const response = await server.fetch('/api/health', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ test: true }),
      })

      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toContain('application/json')

      const data = await response.json()
      expect(data.method).toBe('POST')
    })
  })

  describe('404 handling', () => {
    it('should return JSON 404 for non-existent API routes', async () => {
      const response = await server.fetch('/api/non-existent')
      expect(response.status).toBe(404)

      const data = await response.json()
      expect(data.error).toBe('Not Found')
    })
  })

  describe('method not found', () => {
    it('should return 404 for unsupported HTTP methods', async () => {
      const response = await server.fetch('/api/health', {
        method: 'DELETE',
      })

      // Routes without DELETE handler return 404
      expect(response.status).toBe(404)
    })
  })
})
