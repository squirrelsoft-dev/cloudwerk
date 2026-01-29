/**
 * Integration Tests: Route Groups
 *
 * Tests route groups with URL path exclusion and group-specific layouts.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createTestServer, type TestServer } from './test-utils.js'

describe('Route Groups', () => {
  let server: TestServer

  beforeAll(async () => {
    server = await createTestServer('route-groups')
  })

  afterAll(async () => {
    await server?.close()
  })

  describe('URL path exclusion', () => {
    it('should exclude group name from URL path for about page', async () => {
      // (marketing)/about should be accessible at /about, not /(marketing)/about
      const response = await server.fetch('/about')
      expect(response.status).toBe(200)

      const html = await response.text()
      expect(html).toContain('data-testid="about-page"')
    })

    it('should exclude group name from URL path for login page', async () => {
      // (auth)/login should be accessible at /login, not /(auth)/login
      const response = await server.fetch('/login')
      expect(response.status).toBe(200)

      const html = await response.text()
      expect(html).toContain('data-testid="login-page"')
    })

    it('should return 404 for group name in URL', async () => {
      // (marketing) should not be part of the URL
      const response = await server.fetch('/(marketing)/about')
      expect(response.status).toBe(404)
    })
  })

  describe('group-specific layouts', () => {
    it('should apply marketing layout to about page', async () => {
      const response = await server.fetch('/about')
      const html = await response.text()

      expect(html).toContain('data-testid="root-layout"')
      expect(html).toContain('data-testid="marketing-layout"')
      expect(html).toContain('data-testid="marketing-header"')
      expect(html).toContain('data-testid="about-page"')
    })

    it('should apply auth layout to login page', async () => {
      const response = await server.fetch('/login')
      const html = await response.text()

      expect(html).toContain('data-testid="root-layout"')
      expect(html).toContain('data-testid="auth-layout"')
      expect(html).toContain('data-testid="auth-container"')
      expect(html).toContain('data-testid="login-page"')
    })

    it('should not apply marketing layout to auth pages', async () => {
      const response = await server.fetch('/login')
      const html = await response.text()

      expect(html).not.toContain('data-testid="marketing-layout"')
      expect(html).not.toContain('data-testid="marketing-header"')
    })

    it('should not apply auth layout to marketing pages', async () => {
      const response = await server.fetch('/about')
      const html = await response.text()

      expect(html).not.toContain('data-testid="auth-layout"')
      expect(html).not.toContain('data-testid="auth-container"')
    })
  })
})
