/**
 * @cloudwerk/ui - Renderer Selection Tests
 *
 * Tests for renderer registration, selection, and management.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  setActiveRenderer,
  getActiveRenderer,
  getActiveRendererName,
  registerRenderer,
  getAvailableRenderers,
  honoJsxRenderer,
  _resetRenderers,
} from '../index.js'
import type { Renderer } from '../types.js'

// ============================================================================
// Test Fixtures
// ============================================================================

/**
 * Create a mock renderer for testing.
 */
function createMockRenderer(name: string): Renderer {
  return {
    render: (element, options) => {
      const body = `[${name}] ${String(element)}`
      return new Response(body, {
        status: options?.status ?? 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          ...options?.headers,
        },
      })
    },
    html: (content, options) => {
      return new Response(content, {
        status: options?.status ?? 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          ...options?.headers,
        },
      })
    },
    hydrate: () => {
      throw new Error(`[${name}] Hydration not implemented`)
    },
  }
}

// ============================================================================
// Default Renderer Tests
// ============================================================================

describe('default renderer', () => {
  beforeEach(() => {
    _resetRenderers()
  })

  it('uses hono-jsx by default', () => {
    const rendererName = getActiveRendererName()
    expect(rendererName).toBe('hono-jsx')
  })

  it('getActiveRenderer returns hono-jsx renderer', () => {
    const renderer = getActiveRenderer()
    expect(renderer).toBe(honoJsxRenderer)
  })

  it('hono-jsx is in available renderers', () => {
    const available = getAvailableRenderers()
    expect(available).toContain('hono-jsx')
  })
})

// ============================================================================
// setActiveRenderer Tests
// ============================================================================

describe('setActiveRenderer()', () => {
  beforeEach(() => {
    _resetRenderers()
  })

  it('switches renderer via setActiveRenderer()', () => {
    const testRenderer = createMockRenderer('test-renderer')
    registerRenderer('test-switch', testRenderer)

    setActiveRenderer('test-switch')

    expect(getActiveRendererName()).toBe('test-switch')
    expect(getActiveRenderer()).toBe(testRenderer)
  })

  it('throws error for unknown renderer', () => {
    expect(() => setActiveRenderer('non-existent')).toThrow('Unknown renderer')
    expect(() => setActiveRenderer('non-existent')).toThrow('non-existent')
  })

  it('error message includes available renderers', () => {
    expect(() => setActiveRenderer('invalid')).toThrow('Available renderers:')
    expect(() => setActiveRenderer('invalid')).toThrow('hono-jsx')
  })

  it('can switch back to hono-jsx', () => {
    const testRenderer = createMockRenderer('test')
    registerRenderer('test-back', testRenderer)
    setActiveRenderer('test-back')
    expect(getActiveRendererName()).toBe('test-back')

    // Switch back
    setActiveRenderer('hono-jsx')
    expect(getActiveRendererName()).toBe('hono-jsx')
    expect(getActiveRenderer()).toBe(honoJsxRenderer)
  })
})

// ============================================================================
// registerRenderer Tests
// ============================================================================

describe('registerRenderer()', () => {
  beforeEach(() => {
    _resetRenderers()
  })

  it('allows custom renderer registration', () => {
    const customRenderer = createMockRenderer('custom')
    registerRenderer('custom', customRenderer)

    const available = getAvailableRenderers()
    expect(available).toContain('custom')
  })

  it('prevents duplicate renderer registration', () => {
    const customRenderer = createMockRenderer('duplicate')
    registerRenderer('duplicate', customRenderer)

    expect(() => registerRenderer('duplicate', customRenderer)).toThrow(
      'Renderer "duplicate" is already registered'
    )
  })

  it('registered renderer can be activated', async () => {
    const customRenderer = createMockRenderer('activatable')
    registerRenderer('activatable', customRenderer)
    setActiveRenderer('activatable')

    const renderer = getActiveRenderer()
    const response = await renderer.render({ toString: () => '<div>Test</div>' })
    const text = await response.text()

    expect(text).toContain('[activatable]')
    expect(text).toContain('<div>Test</div>')
  })

  it('cannot override built-in hono-jsx renderer', () => {
    const fakeRenderer = createMockRenderer('fake-hono')

    expect(() => registerRenderer('hono-jsx', fakeRenderer)).toThrow(
      'already registered'
    )
  })
})

// ============================================================================
// getAvailableRenderers Tests
// ============================================================================

describe('getAvailableRenderers()', () => {
  beforeEach(() => {
    _resetRenderers()
  })

  it('returns array of renderer names', () => {
    const available = getAvailableRenderers()

    expect(Array.isArray(available)).toBe(true)
    expect(available.length).toBeGreaterThan(0)
  })

  it('always includes hono-jsx', () => {
    const available = getAvailableRenderers()

    expect(available).toContain('hono-jsx')
  })

  it('includes newly registered renderers', () => {
    const customRenderer = createMockRenderer('new')
    registerRenderer('new-renderer', customRenderer)

    const available = getAvailableRenderers()
    expect(available).toContain('new-renderer')
  })
})

// ============================================================================
// getActiveRendererName Tests
// ============================================================================

describe('getActiveRendererName()', () => {
  beforeEach(() => {
    _resetRenderers()
  })

  it('returns current renderer name', () => {
    const name = getActiveRendererName()
    expect(name).toBe('hono-jsx')
  })

  it('updates when renderer changes', () => {
    const customRenderer = createMockRenderer('named')
    registerRenderer('named-renderer', customRenderer)

    setActiveRenderer('named-renderer')
    expect(getActiveRendererName()).toBe('named-renderer')

    setActiveRenderer('hono-jsx')
    expect(getActiveRendererName()).toBe('hono-jsx')
  })
})

// ============================================================================
// Hono JSX Renderer Specific Tests
// ============================================================================

describe('honoJsxRenderer', () => {
  beforeEach(() => {
    _resetRenderers()
  })

  it('is exported from package', () => {
    expect(honoJsxRenderer).toBeDefined()
    expect(typeof honoJsxRenderer.render).toBe('function')
    expect(typeof honoJsxRenderer.html).toBe('function')
    expect(typeof honoJsxRenderer.hydrate).toBe('function')
  })

  it('render uses toString on element', async () => {
    const element = {
      toString() {
        return '<div id="test">Content</div>'
      },
    }

    const response = await honoJsxRenderer.render(element)
    const text = await response.text()

    expect(text).toBe('<!DOCTYPE html><div id="test">Content</div>')
  })

  it('html returns raw content without modification', async () => {
    const content = '<html><head></head><body>Test</body></html>'

    const response = honoJsxRenderer.html(content)
    const text = await response.text()

    expect(text).toBe(content)
  })

  it('hydrate throws with informative error', () => {
    expect(() => honoJsxRenderer.hydrate({}, {} as Element)).toThrow(
      'Client hydration requires hono/jsx/dom'
    )
  })
})
