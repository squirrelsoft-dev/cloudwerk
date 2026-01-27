/**
 * @cloudwerk/ui - Render Function Tests
 *
 * Tests for the render(), html(), and hydrate() facade functions.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  render,
  html,
  hydrate,
  setActiveRenderer,
  getActiveRenderer,
} from '../index.js'
import type { Renderer } from '../types.js'

// ============================================================================
// Test Fixtures
// ============================================================================

/**
 * Mock JSX element that implements toString() like Hono JSX.
 */
function createMockJsxElement(content: string): unknown {
  return {
    toString() {
      return content
    },
  }
}

// ============================================================================
// render() Tests
// ============================================================================

describe('render()', () => {
  beforeEach(() => {
    // Reset to default renderer before each test
    setActiveRenderer('hono-jsx')
  })

  it('converts JSX element to HTML Response', async () => {
    const element = createMockJsxElement('<html><body>Hello</body></html>')

    const response = await render(element)

    expect(response).toBeInstanceOf(Response)
    const text = await response.text()
    expect(text).toContain('<html><body>Hello</body></html>')
  })

  it('includes doctype by default', async () => {
    const element = createMockJsxElement('<html><body>Test</body></html>')

    const response = await render(element)

    const text = await response.text()
    expect(text).toBe('<!DOCTYPE html><html><body>Test</body></html>')
  })

  it('excludes doctype when disabled', async () => {
    const element = createMockJsxElement('<html><body>Test</body></html>')

    const response = await render(element, { doctype: false })

    const text = await response.text()
    expect(text).toBe('<html><body>Test</body></html>')
    expect(text).not.toContain('<!DOCTYPE html>')
  })

  it('sets correct content-type header', async () => {
    const element = createMockJsxElement('<html></html>')

    const response = await render(element)

    expect(response.headers.get('Content-Type')).toBe('text/html; charset=utf-8')
  })

  it('applies custom status code', async () => {
    const element = createMockJsxElement('<html><body>Not Found</body></html>')

    const response = await render(element, { status: 404 })

    expect(response.status).toBe(404)
  })

  it('applies custom headers', async () => {
    const element = createMockJsxElement('<html></html>')

    const response = await render(element, {
      headers: {
        'X-Custom-Header': 'custom-value',
        'Cache-Control': 'no-cache',
      },
    })

    expect(response.headers.get('X-Custom-Header')).toBe('custom-value')
    expect(response.headers.get('Cache-Control')).toBe('no-cache')
    // Should still have content-type
    expect(response.headers.get('Content-Type')).toBe('text/html; charset=utf-8')
  })

  it('custom headers can override content-type', async () => {
    const element = createMockJsxElement('<html></html>')

    const response = await render(element, {
      headers: {
        'Content-Type': 'text/html; charset=iso-8859-1',
      },
    })

    expect(response.headers.get('Content-Type')).toBe('text/html; charset=iso-8859-1')
  })

  it('uses default status 200 when not specified', async () => {
    const element = createMockJsxElement('<html></html>')

    const response = await render(element)

    expect(response.status).toBe(200)
  })

  it('handles empty element', async () => {
    const element = createMockJsxElement('')

    const response = await render(element)

    const text = await response.text()
    expect(text).toBe('<!DOCTYPE html>')
  })

  it('handles complex HTML content', async () => {
    const complexHtml = `<html lang="en">
      <head>
        <title>Test Page</title>
        <meta charset="UTF-8">
      </head>
      <body>
        <div id="root">
          <h1>Hello World</h1>
          <p>This is a test.</p>
        </div>
      </body>
    </html>`
    const element = createMockJsxElement(complexHtml)

    const response = await render(element)

    const text = await response.text()
    expect(text).toContain('<!DOCTYPE html>')
    expect(text).toContain('<title>Test Page</title>')
    expect(text).toContain('<h1>Hello World</h1>')
  })
})

// ============================================================================
// html() Tests
// ============================================================================

describe('html()', () => {
  beforeEach(() => {
    setActiveRenderer('hono-jsx')
  })

  it('wraps raw HTML in Response', async () => {
    const content = '<html><body>Hello</body></html>'

    const response = html(content)

    expect(response).toBeInstanceOf(Response)
    const text = await response.text()
    expect(text).toBe(content)
  })

  it('sets correct content-type header', () => {
    const response = html('<html></html>')

    expect(response.headers.get('Content-Type')).toBe('text/html; charset=utf-8')
  })

  it('applies custom status code', () => {
    const response = html('<html><body>Not Found</body></html>', { status: 404 })

    expect(response.status).toBe(404)
  })

  it('uses default status 200 when not specified', () => {
    const response = html('<html></html>')

    expect(response.status).toBe(200)
  })

  it('applies custom headers', () => {
    const response = html('<html></html>', {
      headers: {
        'X-Custom': 'value',
        'Cache-Control': 'max-age=3600',
      },
    })

    expect(response.headers.get('X-Custom')).toBe('value')
    expect(response.headers.get('Cache-Control')).toBe('max-age=3600')
    expect(response.headers.get('Content-Type')).toBe('text/html; charset=utf-8')
  })

  it('does not add doctype to raw HTML', async () => {
    const content = '<html><body>Test</body></html>'

    const response = html(content)

    const text = await response.text()
    expect(text).toBe(content)
    expect(text).not.toContain('<!DOCTYPE html>')
  })

  it('preserves existing doctype in content', async () => {
    const content = '<!DOCTYPE html><html><body>Test</body></html>'

    const response = html(content)

    const text = await response.text()
    expect(text).toBe(content)
  })

  it('handles empty content', async () => {
    const response = html('')

    const text = await response.text()
    expect(text).toBe('')
  })
})

// ============================================================================
// hydrate() Tests
// ============================================================================

describe('hydrate()', () => {
  beforeEach(() => {
    setActiveRenderer('hono-jsx')
  })

  it('throws error when called in non-browser environment', () => {
    const element = createMockJsxElement('<div>Test</div>')
    const mockRoot = {} as Element

    // In Node.js test environment, hydrate should throw because window/document are not available
    expect(() => hydrate(element, mockRoot)).toThrow('browser environment')
  })

  it('error message is informative about environment requirement', () => {
    const element = createMockJsxElement('<div>Test</div>')
    const mockRoot = {} as Element

    expect(() => hydrate(element, mockRoot)).toThrow('hydrate() can only be called in a browser environment')
  })
})

// ============================================================================
// Custom Renderer Tests
// ============================================================================

describe('render() with custom renderer', () => {
  it('uses custom renderer when set', async () => {
    // Create a mock custom renderer
    const customRenderer: Renderer = {
      render: (element, options) => {
        const body = `CUSTOM:${String(element)}`
        return new Response(body, {
          status: options?.status ?? 200,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        })
      },
      html: (content, options) => {
        return new Response(content, {
          status: options?.status ?? 200,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        })
      },
      hydrate: () => {
        throw new Error('Custom hydrate not implemented')
      },
    }

    // Register and set the custom renderer
    const { registerRenderer } = await import('../renderer.js')
    registerRenderer('custom-test', customRenderer)
    setActiveRenderer('custom-test')

    const element = createMockJsxElement('<html></html>')
    const response = await render(element)

    const text = await response.text()
    expect(text).toBe('CUSTOM:<html></html>')

    // Reset to default
    setActiveRenderer('hono-jsx')
  })

  it('delegates to active renderer', async () => {
    const renderer = getActiveRenderer()
    const element = createMockJsxElement('<div>Test</div>')

    // render() should use the same renderer
    const response1 = await render(element)
    const response2 = await renderer.render(element)

    const text1 = await response1.text()
    const text2 = await response2.text()
    expect(text1).toBe(text2)
  })
})
