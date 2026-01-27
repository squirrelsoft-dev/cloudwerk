/**
 * @cloudwerk/ui - React Renderer Tests
 *
 * Tests for the React renderer implementation using react-dom/server.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import React from 'react'
import { reactRenderer, reactRenderToStream } from '../renderers/react.js'
import {
  setActiveRenderer,
  getActiveRenderer,
  getActiveRendererName,
  getAvailableRenderers,
  initReactRenderer,
  _resetRenderers,
} from '../renderer.js'

// ============================================================================
// Test Fixtures
// ============================================================================

/**
 * Helper to read all chunks from a streaming response.
 */
async function readStreamingResponse(response: Response): Promise<string> {
  const reader = response.body?.getReader()
  if (!reader) {
    return response.text()
  }

  const chunks: string[] = []
  const decoder = new TextDecoder()

  let done = false
  while (!done) {
    const result = await reader.read()
    done = result.done
    if (result.value) {
      chunks.push(decoder.decode(result.value, { stream: true }))
    }
  }

  return chunks.join('')
}

// ============================================================================
// reactRenderer Tests
// ============================================================================

describe('reactRenderer', () => {
  beforeEach(() => {
    _resetRenderers()
  })

  describe('render()', () => {
    it('converts React element to HTML Response', async () => {
      const element = React.createElement('div', null, 'Hello World')

      const response = await Promise.resolve(reactRenderer.render(element))

      expect(response).toBeInstanceOf(Response)
      const text = await response.text()
      expect(text).toContain('<div>Hello World</div>')
    })

    it('includes doctype by default', async () => {
      const element = React.createElement('html', null,
        React.createElement('body', null, 'Test')
      )

      const response = await Promise.resolve(reactRenderer.render(element))

      const text = await response.text()
      expect(text).toMatch(/^<!DOCTYPE html>/)
    })

    it('excludes doctype when disabled', async () => {
      const element = React.createElement('div', null, 'Test')

      const response = await Promise.resolve(reactRenderer.render(element, { doctype: false }))

      const text = await response.text()
      expect(text).not.toContain('<!DOCTYPE html>')
      expect(text).toBe('<div>Test</div>')
    })

    it('sets correct content-type header', async () => {
      const element = React.createElement('div', null, 'Test')

      const response = await Promise.resolve(reactRenderer.render(element))

      expect(response.headers.get('Content-Type')).toBe('text/html; charset=utf-8')
    })

    it('applies custom status code', async () => {
      const element = React.createElement('div', null, 'Not Found')

      const response = await Promise.resolve(reactRenderer.render(element, { status: 404 }))

      expect(response.status).toBe(404)
    })

    it('applies custom headers', async () => {
      const element = React.createElement('div', null, 'Test')

      const response = await Promise.resolve(reactRenderer.render(element, {
        headers: {
          'X-Custom-Header': 'custom-value',
          'Cache-Control': 'no-cache',
        },
      }))

      expect(response.headers.get('X-Custom-Header')).toBe('custom-value')
      expect(response.headers.get('Cache-Control')).toBe('no-cache')
      expect(response.headers.get('Content-Type')).toBe('text/html; charset=utf-8')
    })

    it('custom headers can override content-type', async () => {
      const element = React.createElement('div', null, 'Test')

      const response = await Promise.resolve(reactRenderer.render(element, {
        headers: {
          'Content-Type': 'text/html; charset=iso-8859-1',
        },
      }))

      expect(response.headers.get('Content-Type')).toBe('text/html; charset=iso-8859-1')
    })

    it('uses default status 200 when not specified', async () => {
      const element = React.createElement('div', null, 'Test')

      const response = await Promise.resolve(reactRenderer.render(element))

      expect(response.status).toBe(200)
    })

    it('handles nested elements', async () => {
      const element = React.createElement('html', { lang: 'en' },
        React.createElement('head', null,
          React.createElement('title', null, 'Test Page')
        ),
        React.createElement('body', null,
          React.createElement('div', { id: 'root' },
            React.createElement('h1', null, 'Hello World'),
            React.createElement('p', null, 'This is a test.')
          )
        )
      )

      const response = await Promise.resolve(reactRenderer.render(element))

      const text = await response.text()
      expect(text).toContain('<!DOCTYPE html>')
      expect(text).toContain('<title>Test Page</title>')
      expect(text).toContain('<h1>Hello World</h1>')
      expect(text).toContain('<p>This is a test.</p>')
    })

    it('handles elements with className', async () => {
      const element = React.createElement('div', { className: 'container' }, 'Content')

      const response = await Promise.resolve(reactRenderer.render(element))

      const text = await response.text()
      expect(text).toContain('class="container"')
    })

    it('escapes special characters in text content', async () => {
      const element = React.createElement('div', null, '<script>alert("xss")</script>')

      const response = await Promise.resolve(reactRenderer.render(element))

      const text = await response.text()
      // React should escape the content
      expect(text).not.toContain('<script>alert')
      expect(text).toContain('&lt;script&gt;')
    })
  })

  describe('html()', () => {
    it('wraps raw HTML in Response', async () => {
      const content = '<html><body>Hello</body></html>'

      const response = reactRenderer.html(content)

      expect(response).toBeInstanceOf(Response)
      const text = await response.text()
      expect(text).toBe(content)
    })

    it('sets correct content-type header', () => {
      const response = reactRenderer.html('<html></html>')

      expect(response.headers.get('Content-Type')).toBe('text/html; charset=utf-8')
    })

    it('applies custom status code', () => {
      const response = reactRenderer.html('<html><body>Not Found</body></html>', { status: 404 })

      expect(response.status).toBe(404)
    })

    it('uses default status 200 when not specified', () => {
      const response = reactRenderer.html('<html></html>')

      expect(response.status).toBe(200)
    })

    it('applies custom headers', () => {
      const response = reactRenderer.html('<html></html>', {
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

      const response = reactRenderer.html(content)

      const text = await response.text()
      expect(text).toBe(content)
      expect(text).not.toContain('<!DOCTYPE html>')
    })

    it('preserves existing doctype in content', async () => {
      const content = '<!DOCTYPE html><html><body>Test</body></html>'

      const response = reactRenderer.html(content)

      const text = await response.text()
      expect(text).toBe(content)
    })
  })

  describe('hydrate()', () => {
    it('throws error when called in non-browser environment', () => {
      const element = React.createElement('div', null, 'Test')
      const mockRoot = {} as Element

      expect(() => reactRenderer.hydrate(element, mockRoot)).toThrow('hydrate() can only be called in a browser environment')
    })

    it('error message mentions using render() for server-side', () => {
      const element = React.createElement('div', null, 'Test')
      const mockRoot = {} as Element

      expect(() => reactRenderer.hydrate(element, mockRoot)).toThrow(/For server-side rendering, use render\(\) instead/)
    })

    it('checks for browser environment before hydrating', () => {
      const element = React.createElement('div', null, 'Test')
      const mockRoot = {} as Element

      // In Node.js, window and document are undefined
      expect(() => reactRenderer.hydrate(element, mockRoot)).toThrow(/browser environment/)
    })
  })
})

// ============================================================================
// reactRenderToStream Tests
// ============================================================================

describe('reactRenderToStream()', () => {
  describe('basic rendering', () => {
    it('converts React element to streaming Response', async () => {
      const element = React.createElement('div', null, 'Hello Streaming')

      const response = await reactRenderToStream(element)

      expect(response).toBeInstanceOf(Response)
      const text = await readStreamingResponse(response)
      expect(text).toContain('<div>Hello Streaming</div>')
    })

    it('returns a Response with ReadableStream body', async () => {
      const element = React.createElement('div', null, 'Test')

      const response = await reactRenderToStream(element)

      expect(response.body).toBeInstanceOf(ReadableStream)
    })
  })

  describe('doctype handling', () => {
    it('includes doctype by default', async () => {
      const element = React.createElement('html', null,
        React.createElement('body', null, 'Test')
      )

      const response = await reactRenderToStream(element)

      const text = await readStreamingResponse(response)
      expect(text).toMatch(/^<!DOCTYPE html>/)
    })

    it('excludes doctype when disabled', async () => {
      const element = React.createElement('div', null, 'Test')

      const response = await reactRenderToStream(element, { doctype: false })

      const text = await readStreamingResponse(response)
      expect(text).not.toContain('<!DOCTYPE html>')
      expect(text).toBe('<div>Test</div>')
    })
  })

  describe('HTTP response options', () => {
    it('sets correct content-type header', async () => {
      const element = React.createElement('div', null, 'Test')

      const response = await reactRenderToStream(element)

      expect(response.headers.get('Content-Type')).toBe('text/html; charset=utf-8')
    })

    it('uses default status 200', async () => {
      const element = React.createElement('div', null, 'Test')

      const response = await reactRenderToStream(element)

      expect(response.status).toBe(200)
    })

    it('applies custom status code', async () => {
      const element = React.createElement('div', null, 'Not Found')

      const response = await reactRenderToStream(element, { status: 404 })

      expect(response.status).toBe(404)
    })

    it('applies custom headers', async () => {
      const element = React.createElement('div', null, 'Test')

      const response = await reactRenderToStream(element, {
        headers: {
          'X-Custom-Header': 'custom-value',
          'Cache-Control': 'no-cache',
        },
      })

      expect(response.headers.get('X-Custom-Header')).toBe('custom-value')
      expect(response.headers.get('Cache-Control')).toBe('no-cache')
      expect(response.headers.get('Content-Type')).toBe('text/html; charset=utf-8')
    })

    it('custom headers can override content-type', async () => {
      const element = React.createElement('div', null, 'Test')

      const response = await reactRenderToStream(element, {
        headers: {
          'Content-Type': 'text/html; charset=iso-8859-1',
        },
      })

      expect(response.headers.get('Content-Type')).toBe('text/html; charset=iso-8859-1')
    })
  })

  describe('content handling', () => {
    it('handles nested elements', async () => {
      const element = React.createElement('html', { lang: 'en' },
        React.createElement('head', null,
          React.createElement('title', null, 'Streaming Test')
        ),
        React.createElement('body', null,
          React.createElement('div', { id: 'root' },
            React.createElement('h1', null, 'Hello World')
          )
        )
      )

      const response = await reactRenderToStream(element)

      const text = await readStreamingResponse(response)
      expect(text).toContain('<!DOCTYPE html>')
      expect(text).toContain('<title>Streaming Test</title>')
      expect(text).toContain('<h1>Hello World</h1>')
    })

    it('escapes special characters in text content', async () => {
      const element = React.createElement('div', null, '<script>alert("xss")</script>')

      const response = await reactRenderToStream(element)

      const text = await readStreamingResponse(response)
      expect(text).not.toContain('<script>alert')
      expect(text).toContain('&lt;script&gt;')
    })
  })

  describe('streaming behavior', () => {
    it('produces valid streaming response that can be consumed', async () => {
      const element = React.createElement('div', null, 'Streaming Test')

      const response = await reactRenderToStream(element)

      const text = await readStreamingResponse(response)
      expect(text).toContain('Streaming Test')
    })

    it('combines all options correctly', async () => {
      const element = React.createElement('div', null, 'Custom')

      const response = await reactRenderToStream(element, {
        status: 201,
        headers: { 'X-Custom': 'test' },
        doctype: true,
      })

      expect(response.status).toBe(201)
      expect(response.headers.get('X-Custom')).toBe('test')
      const text = await readStreamingResponse(response)
      expect(text).toMatch(/^<!DOCTYPE html>/)
      expect(text).toContain('Custom')
    })
  })
})

// ============================================================================
// React Renderer Registration Tests
// ============================================================================

describe('React renderer registration', () => {
  beforeEach(async () => {
    _resetRenderers()
    // Initialize React renderer for these tests
    await initReactRenderer()
  })

  it('react is available in renderer registry after init', () => {
    const available = getAvailableRenderers()
    expect(available).toContain('react')
  })

  it('can set react as active renderer', () => {
    setActiveRenderer('react')

    expect(getActiveRendererName()).toBe('react')
    expect(getActiveRenderer()).toBe(reactRenderer)
  })

  it('react renderer works when set as active', async () => {
    setActiveRenderer('react')
    const renderer = getActiveRenderer()
    const element = React.createElement('div', null, 'Active React')

    const response = await Promise.resolve(renderer.render(element))

    const text = await response.text()
    expect(text).toContain('<div>Active React</div>')
  })

  it('can switch between hono-jsx and react', () => {
    // Start with default
    expect(getActiveRendererName()).toBe('hono-jsx')

    // Switch to react
    setActiveRenderer('react')
    expect(getActiveRendererName()).toBe('react')

    // Switch back to hono-jsx
    setActiveRenderer('hono-jsx')
    expect(getActiveRendererName()).toBe('hono-jsx')
  })
})

describe('React renderer without initialization', () => {
  beforeEach(() => {
    _resetRenderers()
  })

  it('react is not available before init', () => {
    const available = getAvailableRenderers()
    expect(available).not.toContain('react')
  })

  it('throws helpful error when setting react without init', () => {
    expect(() => setActiveRenderer('react')).toThrow('initReactRenderer')
  })

  it('initReactRenderer makes react available', async () => {
    expect(getAvailableRenderers()).not.toContain('react')

    await initReactRenderer()

    expect(getAvailableRenderers()).toContain('react')
  })

  it('initReactRenderer is idempotent', async () => {
    await initReactRenderer()
    await initReactRenderer() // Should not throw

    expect(getAvailableRenderers()).toContain('react')
  })
})
