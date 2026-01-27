/**
 * @cloudwerk/ui - Type Definitions
 *
 * Core types for the renderer abstraction layer.
 */

// ============================================================================
// Renderer Interface
// ============================================================================

/**
 * Renderer implementation interface.
 *
 * Each renderer (hono-jsx, react, preact) implements this interface.
 * The renderer is responsible for converting JSX elements to HTML responses.
 */
export interface Renderer {
  /**
   * Render a JSX element to an HTML Response.
   *
   * @param element - JSX element to render (type is unknown to support any JSX implementation)
   * @param options - Render options
   * @returns Response object (may be a Promise for async rendering)
   */
  render(element: unknown, options?: RenderOptions): Response | Promise<Response>

  /**
   * Create an HTML Response from a raw string.
   *
   * Useful for static HTML, templates, or pre-rendered content.
   *
   * @param content - Raw HTML string
   * @param options - HTML response options
   * @returns Response object
   */
  html(content: string, options?: HtmlOptions): Response

  /**
   * Hydrate a JSX element on the client.
   *
   * Only used for Client Components marked with 'use client'.
   * This attaches event handlers to server-rendered HTML.
   *
   * @param element - JSX element to hydrate
   * @param root - DOM element to hydrate into
   */
  hydrate(element: unknown, root: Element): void
}

// ============================================================================
// Options Types
// ============================================================================

/**
 * Options for rendering JSX elements.
 */
export interface RenderOptions {
  /**
   * HTTP status code for the response.
   * @default 200
   */
  status?: number

  /**
   * Additional response headers.
   * These are merged with the default Content-Type header.
   */
  headers?: Record<string, string>

  /**
   * Whether to include the <!DOCTYPE html> declaration.
   * @default true
   */
  doctype?: boolean
}

/**
 * Options for creating HTML responses from raw strings.
 */
export interface HtmlOptions {
  /**
   * HTTP status code for the response.
   * @default 200
   */
  status?: number

  /**
   * Additional response headers.
   * These are merged with the default Content-Type header.
   */
  headers?: Record<string, string>
}

// ============================================================================
// Component Types
// ============================================================================

/**
 * Props for components that receive children.
 *
 * Works with any JSX implementation (Hono JSX, React, Preact).
 * The children type is `unknown` to allow any JSX element type.
 *
 * @example
 * function Layout({ children }: PropsWithChildren) {
 *   return (
 *     <html>
 *       <body>{children}</body>
 *     </html>
 *   )
 * }
 */
export interface PropsWithChildren<_P = unknown> {
  children?: unknown
}
