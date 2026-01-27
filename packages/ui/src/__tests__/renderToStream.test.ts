/**
 * @cloudwerk/ui - renderToStream Tests
 *
 * Tests for the renderToStream() function that provides native progressive
 * streaming with Suspense boundary support using Hono's renderToReadableStream.
 */

import { describe, it, expect } from 'vitest'
import { renderToStream } from '../renderers/hono-jsx.js'

// ============================================================================
// Test Fixtures
// ============================================================================

/**
 * Mock JSX element that implements toString() like Hono JSX.
 * This simulates a synchronous JSX element.
 */
function createMockJsxElement(content: string): unknown {
  return {
    toString() {
      return content
    },
  }
}

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
// renderToStream() Tests
// ============================================================================

describe('renderToStream()', () => {
  describe('basic rendering', () => {
    it('converts JSX element to streaming Response', async () => {
      const element = createMockJsxElement('<html><body>Hello</body></html>')

      const response = await renderToStream(element)

      expect(response).toBeInstanceOf(Response)
      const text = await readStreamingResponse(response)
      expect(text).toContain('<html><body>Hello</body></html>')
    })

    it('returns a Response with ReadableStream body', async () => {
      const element = createMockJsxElement('<html></html>')

      const response = await renderToStream(element)

      expect(response.body).toBeInstanceOf(ReadableStream)
    })
  })

  describe('doctype handling', () => {
    it('includes doctype by default', async () => {
      const element = createMockJsxElement('<html><body>Test</body></html>')

      const response = await renderToStream(element)

      const text = await readStreamingResponse(response)
      expect(text).toMatch(/^<!DOCTYPE html>/)
    })

    it('excludes doctype when disabled', async () => {
      const element = createMockJsxElement('<html><body>Test</body></html>')

      const response = await renderToStream(element, { doctype: false })

      const text = await readStreamingResponse(response)
      expect(text).not.toContain('<!DOCTYPE html>')
      expect(text).toBe('<html><body>Test</body></html>')
    })
  })

  describe('HTTP response options', () => {
    it('sets correct content-type header', async () => {
      const element = createMockJsxElement('<html></html>')

      const response = await renderToStream(element)

      expect(response.headers.get('Content-Type')).toBe('text/html; charset=utf-8')
    })

    it('uses default status 200', async () => {
      const element = createMockJsxElement('<html></html>')

      const response = await renderToStream(element)

      expect(response.status).toBe(200)
    })

    it('applies custom status code', async () => {
      const element = createMockJsxElement('<html><body>Not Found</body></html>')

      const response = await renderToStream(element, { status: 404 })

      expect(response.status).toBe(404)
    })

    it('applies custom headers', async () => {
      const element = createMockJsxElement('<html></html>')

      const response = await renderToStream(element, {
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

      const response = await renderToStream(element, {
        headers: {
          'Content-Type': 'text/html; charset=iso-8859-1',
        },
      })

      expect(response.headers.get('Content-Type')).toBe('text/html; charset=iso-8859-1')
    })
  })

  describe('content handling', () => {
    it('handles empty element', async () => {
      const element = createMockJsxElement('')

      const response = await renderToStream(element)

      const text = await readStreamingResponse(response)
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

      const response = await renderToStream(element)

      const text = await readStreamingResponse(response)
      expect(text).toContain('<!DOCTYPE html>')
      expect(text).toContain('<title>Test Page</title>')
      expect(text).toContain('<h1>Hello World</h1>')
    })

    it('preserves HTML special characters', async () => {
      const element = createMockJsxElement('<div>&lt;script&gt;alert("xss")&lt;/script&gt;</div>')

      const response = await renderToStream(element)

      const text = await readStreamingResponse(response)
      expect(text).toContain('&lt;script&gt;alert("xss")&lt;/script&gt;')
    })
  })

  describe('streaming behavior', () => {
    it('produces valid streaming response that can be consumed', async () => {
      const element = createMockJsxElement('<html><body>Streaming Test</body></html>')

      const response = await renderToStream(element)

      // Verify we can consume the stream
      const text = await readStreamingResponse(response)
      expect(text).toContain('Streaming Test')
    })

    it('combines all options correctly', async () => {
      const element = createMockJsxElement('<html><body>Custom</body></html>')

      const response = await renderToStream(element, {
        status: 201,
        headers: { 'X-Custom': 'test' },
        doctype: true,
      })

      expect(response.status).toBe(201)
      expect(response.headers.get('X-Custom')).toBe('test')
      const text = await readStreamingResponse(response)
      expect(text).toMatch(/^<!DOCTYPE html>/)
      expect(text).toContain('<body>Custom</body>')
    })
  })
})
