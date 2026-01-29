/**
 * Integration Tests: Static Assets
 *
 * Tests static file serving from the public/ directory.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createTestServer, type TestServer } from './test-utils.js'

describe('Static Assets', () => {
  let server: TestServer

  beforeAll(async () => {
    server = await createTestServer('static-assets-app')
  })

  afterAll(async () => {
    await server?.close()
  })

  describe('static file serving', () => {
    it('should serve favicon.ico from public/', async () => {
      const response = await server.fetch('/favicon.ico')
      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toContain('image/')
    })

    it('should serve text files from public/', async () => {
      const response = await server.fetch('/robots.txt')
      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toContain('text/plain')

      const text = await response.text()
      expect(text).toContain('User-agent:')
    })

    it('should serve nested static files', async () => {
      const response = await server.fetch('/images/logo.png')
      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toContain('image/')
    })

    it('should return 404 for missing static files', async () => {
      const response = await server.fetch('/nonexistent.png')
      expect(response.status).toBe(404)
    })
  })

  describe('route priority', () => {
    it('should not conflict with page routes', async () => {
      const response = await server.fetch('/')
      expect(response.status).toBe(200)
      const html = await response.text()
      expect(html).toContain('data-testid="home"')
    })
  })
})
