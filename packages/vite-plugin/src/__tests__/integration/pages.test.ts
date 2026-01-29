/**
 * Integration Tests: Page Routes
 *
 * Tests basic page rendering, layout application, and hydration script injection.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createTestServer, type TestServer } from './test-utils.js'

describe('Page Routes', () => {
  let server: TestServer

  beforeAll(async () => {
    server = await createTestServer('basic-app')
  })

  afterAll(async () => {
    await server?.close()
  })

  describe('basic rendering', () => {
    it('should render the home page', async () => {
      const response = await server.fetch('/')
      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toContain('text/html')

      const html = await response.text()
      expect(html).toContain('Welcome Home')
      expect(html).toContain('data-testid="home-page"')
    })

    it('should render the about page', async () => {
      const response = await server.fetch('/about')
      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toContain('text/html')

      const html = await response.text()
      expect(html).toContain('About Us')
      expect(html).toContain('data-testid="about-page"')
    })

    it('should return proper HTML structure with doctype', async () => {
      const response = await server.fetch('/')
      const html = await response.text()

      expect(html).toMatch(/^<!DOCTYPE html>/)
      expect(html).toContain('<html')
      expect(html).toContain('<head>')
      expect(html).toContain('<body>')
    })
  })

  describe('layout application', () => {
    it('should wrap home page with root layout', async () => {
      const response = await server.fetch('/')
      const html = await response.text()

      // Layout elements should be present
      expect(html).toContain('data-testid="header"')
      expect(html).toContain('data-testid="main"')

      // Navigation from layout
      expect(html).toContain('href="/"')
      expect(html).toContain('href="/about"')
    })

    it('should wrap about page with root layout', async () => {
      const response = await server.fetch('/about')
      const html = await response.text()

      // Layout elements should be present
      expect(html).toContain('data-testid="header"')
      expect(html).toContain('data-testid="main"')
    })
  })

  describe('hydration script injection', () => {
    it('should inject hydration script before closing body tag', async () => {
      const response = await server.fetch('/')
      const html = await response.text()

      expect(html).toContain('virtual:cloudwerk/client-entry')
      expect(html).toContain('<script type="module"')

      // Script should be before </body>
      const scriptIndex = html.indexOf('virtual:cloudwerk/client-entry')
      const bodyCloseIndex = html.indexOf('</body>')
      expect(scriptIndex).toBeLessThan(bodyCloseIndex)
    })
  })

  describe('404 handling', () => {
    it('should return JSON 404 for non-existent pages', async () => {
      const response = await server.fetch('/non-existent')
      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toBe('Not Found')
    })
  })
})
