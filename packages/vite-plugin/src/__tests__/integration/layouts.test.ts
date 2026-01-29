/**
 * Integration Tests: Layouts
 *
 * Tests root layout, nested layouts, and layout wrapping order.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createTestServer, type TestServer } from './test-utils.js'

describe('Layouts', () => {
  let server: TestServer

  beforeAll(async () => {
    server = await createTestServer('layouts-app')
  })

  afterAll(async () => {
    await server.close()
  })

  describe('root layout', () => {
    it('should wrap home page with root layout', async () => {
      const response = await server.fetch('/')
      expect(response.status).toBe(200)

      const html = await response.text()
      expect(html).toContain('data-testid="root-layout"')
      expect(html).toContain('data-testid="root-header"')
      expect(html).toContain('data-testid="root-footer"')
      expect(html).toContain('data-testid="home-page"')
    })
  })

  describe('nested layouts', () => {
    it('should wrap dashboard page with root and dashboard layouts', async () => {
      const response = await server.fetch('/dashboard')
      expect(response.status).toBe(200)

      const html = await response.text()

      // Root layout elements
      expect(html).toContain('data-testid="root-layout"')
      expect(html).toContain('data-testid="root-header"')

      // Dashboard layout elements
      expect(html).toContain('data-testid="dashboard-layout"')
      expect(html).toContain('data-testid="dashboard-nav"')

      // Page content
      expect(html).toContain('data-testid="dashboard-page"')
    })

    it('should wrap settings page with all nested layouts', async () => {
      const response = await server.fetch('/dashboard/settings')
      expect(response.status).toBe(200)

      const html = await response.text()

      // All layouts should be present
      expect(html).toContain('data-testid="root-layout"')
      expect(html).toContain('data-testid="dashboard-layout"')
      expect(html).toContain('data-testid="settings-page"')
    })
  })

  describe('layout wrapping order', () => {
    it('should nest layouts from root to closest (outside-in)', async () => {
      const response = await server.fetch('/dashboard')
      const html = await response.text()

      // Root layout should come first (outermost)
      const rootLayoutIndex = html.indexOf('data-testid="root-layout"')
      const dashboardLayoutIndex = html.indexOf('data-testid="dashboard-layout"')
      const dashboardPageIndex = html.indexOf('data-testid="dashboard-page"')

      expect(rootLayoutIndex).toBeLessThan(dashboardLayoutIndex)
      expect(dashboardLayoutIndex).toBeLessThan(dashboardPageIndex)
    })
  })
})
