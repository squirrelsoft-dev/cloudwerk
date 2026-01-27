/**
 * @cloudwerk/ui
 *
 * UI rendering abstraction for Cloudwerk.
 *
 * This package provides a renderer-agnostic API for rendering JSX components
 * to HTML responses. The default renderer uses Hono JSX, but custom renderers
 * (React, Preact, etc.) can be registered and selected via configuration.
 *
 * @packageDocumentation
 */

import { getActiveRenderer } from './renderer.js'
import type { RenderOptions, HtmlOptions } from './types.js'

// ============================================================================
// Type Exports
// ============================================================================

export type {
  Renderer,
  RenderOptions,
  HtmlOptions,
  StreamRenderOptions,
  RenderToStreamOptions,
  PropsWithChildren,
} from './types.js'

// ============================================================================
// Renderer Management Exports
// ============================================================================

export {
  setActiveRenderer,
  getActiveRenderer,
  getActiveRendererName,
  registerRenderer,
  getAvailableRenderers,
  initReactRenderer,
  _resetRenderers,
} from './renderer.js'

// ============================================================================
// Renderer Implementation Exports
// ============================================================================

export { honoJsxRenderer, renderStream, renderToStream } from './renderers/index.js'

// Note: React renderer exports (reactRenderer, reactRenderToStream) are not
// re-exported here because React is an optional peer dependency. To use the
// React renderer:
// 1. Install react and react-dom: npm install react react-dom
// 2. Call initReactRenderer() to register the renderer
// 3. Call setActiveRenderer('react') to activate it
// Or import directly: import { reactRenderer } from '@cloudwerk/ui/renderers/react'

// ============================================================================
// Facade Functions
// ============================================================================

/**
 * Render a JSX element to an HTML Response.
 *
 * Uses the currently active renderer (default: hono-jsx).
 * Supports streaming for async components (via renderer implementation).
 *
 * @param element - JSX element to render
 * @param options - Render options
 * @returns Response object (may be Promise for async rendering)
 *
 * @example
 * import { render } from '@cloudwerk/ui'
 *
 * // In a route handler
 * app.get('/', (c) => {
 *   return render(<HomePage />)
 * })
 *
 * @example
 * // With options
 * return render(<NotFoundPage />, { status: 404 })
 *
 * @example
 * // With custom headers
 * return render(<App />, {
 *   headers: { 'X-Custom-Header': 'value' }
 * })
 */
export function render(
  element: unknown,
  options?: RenderOptions
): Response | Promise<Response> {
  return getActiveRenderer().render(element, options)
}

/**
 * Create an HTML Response from a raw string.
 *
 * Useful for static HTML, templates, or pre-rendered content
 * that doesn't need to go through JSX rendering.
 *
 * @param content - Raw HTML string
 * @param options - HTML response options
 * @returns Response object
 *
 * @example
 * import { html } from '@cloudwerk/ui'
 *
 * // Return static HTML
 * return html('<!DOCTYPE html><html><body>Hello</body></html>')
 *
 * @example
 * // With custom status
 * return html('<html><body>Not Found</body></html>', { status: 404 })
 */
export function html(content: string, options?: HtmlOptions): Response {
  return getActiveRenderer().html(content, options)
}

/**
 * Hydrate a JSX element on the client.
 *
 * Only used for Client Components marked with 'use client'.
 * This attaches event handlers to server-rendered HTML.
 *
 * Note: This feature requires issue #39 to be implemented.
 * Currently throws an informative error.
 *
 * @param element - JSX element to hydrate
 * @param root - DOM element to hydrate into
 *
 * @example
 * import { hydrate } from '@cloudwerk/ui'
 *
 * // Client-side entry point
 * hydrate(<App />, document.getElementById('root')!)
 */
export function hydrate(element: unknown, root: Element): void {
  return getActiveRenderer().hydrate(element, root)
}
