/**
 * @cloudwerk/ui - React Renderer
 *
 * React SSR renderer implementation using react-dom/server.
 * This provides an alternative to the Hono JSX renderer for projects
 * that prefer React's rendering pipeline.
 */

import { renderToString, renderToReadableStream } from 'react-dom/server'
import type { ReactElement } from 'react'
import type { Renderer, RenderOptions, HtmlOptions, RenderToStreamOptions } from '../types.js'

/**
 * React renderer implementation.
 *
 * Uses react-dom/server for server-side rendering. This renderer enables
 * Cloudwerk applications to use React instead of Hono JSX.
 *
 * Features:
 * - Synchronous rendering via renderToString()
 * - Automatic doctype handling
 * - Proper Content-Type headers
 *
 * Native progressive streaming is available via reactRenderToStream() using React's
 * renderToReadableStream for Suspense boundary support.
 */
export const reactRenderer: Renderer = {
  /**
   * Render a React element to an HTML Response.
   *
   * Uses React's renderToString() for synchronous server-side rendering.
   * This method wraps the output in a proper Response object with headers.
   *
   * @param element - React element (React.ReactElement)
   * @param options - Render options
   * @returns Response object with HTML content
   */
  render(element: unknown, options: RenderOptions = {}): Response {
    const { status = 200, headers = {}, doctype = true } = options

    // Use React's renderToString for synchronous rendering
    const htmlString = renderToString(element as ReactElement)
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
   * Hydrate a React element on the client.
   *
   * Uses react-dom/client's hydrateRoot to attach event handlers and state
   * to server-rendered HTML. This is called by the client-side hydration
   * runtime for each Client Component.
   *
   * Note: This method is primarily used by the client-side hydration runtime.
   * In server-side code, it will throw an error since the DOM is not available.
   *
   * @param element - React element to hydrate
   * @param root - DOM element to hydrate into
   * @throws Error if called in a non-browser environment
   */
  hydrate(element: unknown, root: Element): void {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      throw new Error(
        'hydrate() can only be called in a browser environment. ' +
          'For server-side rendering, use render() instead.'
      )
    }

    // Dynamic import to avoid issues on server-side
    // This will be bundled by esbuild for client-side code
    import('react-dom/client').then(({ hydrateRoot }) => {
      hydrateRoot(root as unknown as HTMLElement, element as ReactElement)
    }).catch((error) => {
      console.error('[Cloudwerk] Failed to hydrate React component:', error)
    })
  },
}

// ============================================================================
// Native Progressive Streaming (Suspense Support)
// ============================================================================

/**
 * Prepend DOCTYPE html to a ReadableStream.
 *
 * Uses a TransformStream to inject the doctype before the first chunk.
 *
 * @param stream - The original ReadableStream
 * @returns A new ReadableStream with DOCTYPE prepended
 */
function prependDoctype(stream: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  const doctypeBytes = encoder.encode('<!DOCTYPE html>')
  let doctypeSent = false

  return stream.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        if (!doctypeSent) {
          controller.enqueue(doctypeBytes)
          doctypeSent = true
        }
        controller.enqueue(chunk)
      },
    })
  )
}

/**
 * Render a React element to a streaming Response using native progressive streaming.
 *
 * This uses React 19's renderToReadableStream for native support of React-style
 * Suspense boundaries. Content inside Suspense components will be progressively
 * streamed as their async content resolves.
 *
 * Unlike synchronous render() which blocks until the full HTML is ready, this function
 * provides true progressive streaming where:
 * - The initial shell is sent immediately
 * - Suspense fallbacks are shown while async content loads
 * - Async content is streamed in-place as it resolves
 * - No JavaScript is required for the initial render
 *
 * @param element - React element to render (may contain Suspense boundaries)
 * @param options - Render options
 * @returns Promise resolving to Response with streaming HTML content
 *
 * @example
 * // In a route handler
 * import { Suspense } from 'react'
 *
 * function Page() {
 *   return (
 *     <html>
 *       <body>
 *         <h1>Dashboard</h1>
 *         <Suspense fallback={<p>Loading stats...</p>}>
 *           <AsyncStats />
 *         </Suspense>
 *       </body>
 *     </html>
 *   )
 * }
 *
 * export function GET() {
 *   return reactRenderToStream(<Page />)
 * }
 */
export async function reactRenderToStream(
  element: unknown,
  options: RenderToStreamOptions = {}
): Promise<Response> {
  const { status = 200, headers = {}, doctype = true } = options

  // React 19's renderToReadableStream returns a Promise<ReadableStream>
  const contentStream = await renderToReadableStream(element as ReactElement)

  // Optionally prepend DOCTYPE
  const stream = doctype ? prependDoctype(contentStream) : contentStream

  return new Response(stream, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      ...headers,
    },
  })
}
