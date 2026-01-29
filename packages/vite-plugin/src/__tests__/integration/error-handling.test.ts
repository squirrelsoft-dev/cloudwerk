/**
 * Integration Tests: Error Handling
 *
 * Tests error.tsx rendering, not-found.tsx, and boundary hierarchy.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createTestServer, type TestServer } from './test-utils.js'

describe('Error Handling', () => {
  let server: TestServer

  beforeAll(async () => {
    server = await createTestServer('error-app')
  })

  afterAll(async () => {
    await server?.close()
  })

  describe('error.tsx rendering', () => {
    it('should render error boundary with digest when loader throws', async () => {
      const response = await server.fetch('/throws-error')
      expect(response.status).toBe(500)

      const html = await response.text()
      expect(html).toContain('data-testid="root-error-boundary"')
      expect(html).toContain('Something went wrong')
      expect(html).toContain('Intentional error from loader')
      expect(html).toContain('data-testid="error-digest"')
      expect(html).toContain('Digest:')
    })
  })

  describe('not-found.tsx rendering', () => {
    it('should render not-found boundary for non-existent routes', async () => {
      const response = await server.fetch('/does-not-exist')
      expect(response.status).toBe(404)

      const html = await response.text()
      expect(html).toContain('data-testid="root-not-found"')
      expect(html).toContain('404 - Page Not Found')
    })

    it('should render not-found boundary when NotFoundError is thrown', async () => {
      const response = await server.fetch('/not-found-route')
      expect(response.status).toBe(404)

      const html = await response.text()
      expect(html).toContain('data-testid="root-not-found"')
    })
  })

  describe('boundary hierarchy', () => {
    it('should render normal page when no error occurs', async () => {
      const response = await server.fetch('/')
      expect(response.status).toBe(200)

      const html = await response.text()
      expect(html).toContain('data-testid="home-page"')
      expect(html).not.toContain('data-testid="root-error-boundary"')
    })

    it('should render admin page normally when no error', async () => {
      const response = await server.fetch('/admin')
      expect(response.status).toBe(200)

      const html = await response.text()
      expect(html).toContain('data-testid="admin-page"')
    })
  })
})
