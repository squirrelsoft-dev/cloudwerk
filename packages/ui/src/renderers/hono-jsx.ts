/**
 * @cloudwerk/ui - Hono JSX Renderer
 *
 * Default renderer implementation using Hono JSX.
 * Hono JSX elements have a toString() method that renders them to HTML.
 */

import type { Renderer, RenderOptions, HtmlOptions } from '../types.js'

/**
 * Hono JSX renderer implementation.
 *
 * Uses hono/jsx for server-side rendering. This is the default renderer
 * for Cloudwerk applications.
 *
 * Features:
 * - Synchronous rendering via toString()
 * - Automatic doctype handling
 * - Proper Content-Type headers
 *
 * Note: Streaming support via renderToReadableStream will be added in issue #38.
 */
export const honoJsxRenderer: Renderer = {
  /**
   * Render a JSX element to an HTML Response.
   *
   * Hono JSX elements implement toString() for rendering to HTML strings.
   * This method wraps the output in a proper Response object with headers.
   *
   * @param element - Hono JSX element (has toString() method)
   * @param options - Render options
   * @returns Response object with HTML content
   */
  render(element: unknown, options: RenderOptions = {}): Response {
    const { status = 200, headers = {}, doctype = true } = options

    // Hono JSX elements implement toString() for rendering
    const htmlString = String(element)
    const body = doctype ? `<!DOCTYPE html>${htmlString}` : htmlString

    return new Response(body, {
      status,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        ...headers,
      },
    })
  },

  /**
   * Create an HTML Response from a raw string.
   *
   * Useful for static HTML, templates, or pre-rendered content
   * that doesn't need to go through JSX rendering.
   *
   * @param content - Raw HTML string
   * @param options - HTML response options
   * @returns Response object with HTML content
   */
  html(content: string, options: HtmlOptions = {}): Response {
    const { status = 200, headers = {} } = options

    return new Response(content, {
      status,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        ...headers,
      },
    })
  },

  /**
   * Hydrate a JSX element on the client.
   *
   * This is a placeholder that throws an informative error.
   * Client-side hydration will be implemented in issue #39.
   *
   * @param _element - JSX element (unused)
   * @param _root - DOM element (unused)
   * @throws Error with information about when this feature will be available
   */
  hydrate(_element: unknown, _root: Element): void {
    throw new Error(
      'Client hydration requires hono/jsx/dom. ' +
        'This feature will be available after issue #39 is implemented.'
    )
  },
}
