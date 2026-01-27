/**
 * @cloudwerk/ui - Hono JSX Renderer
 *
 * Default renderer implementation using Hono JSX.
 * Hono JSX elements have a toString() method that renders them to HTML.
 */

import { renderToReadableStream } from 'hono/jsx/streaming'
import type { Renderer, RenderOptions, HtmlOptions, StreamRenderOptions, RenderToStreamOptions } from '../types.js'

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
 * Native progressive streaming is available via renderToStream() using Hono's
 * renderToReadableStream for Suspense boundary support.
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
   * Uses hono/jsx/dom render function to attach event handlers and state
   * to server-rendered HTML. This is called by the client-side hydration
   * bootstrap script for each Client Component.
   *
   * Note: This method is primarily used by the client-side hydration runtime.
   * In server-side code, it will throw an error since the DOM is not available.
   *
   * @param element - JSX element to hydrate
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
    // Note: We cast root to unknown first since hono/jsx/dom expects HTMLElement,
    // but we accept Element for broader compatibility. At runtime, the element
    // passed should be an HTMLElement from document.querySelector.
    import('hono/jsx/dom').then(({ render }) => {
      render(element as Parameters<typeof render>[0], root as unknown as HTMLElement)
    }).catch((error) => {
      console.error('[Cloudwerk] Failed to hydrate component:', error)
    })
  },
}

// ============================================================================
// Streaming Render Support
// ============================================================================

/**
 * Create a streaming HTML Response that sends loading UI immediately,
 * then streams the final content when the content promise resolves.
 *
 * This uses a chunked transfer encoding to send HTML in two parts:
 * 1. Loading UI (sent immediately)
 * 2. Final content with script to replace loading UI (sent when ready)
 *
 * Note: The innerHTML assignment in the client script is safe because we only
 * use server-rendered content that we control. No user input is directly
 * inserted into the HTML.
 *
 * @param loadingElement - Loading UI to show immediately (JSX element)
 * @param contentPromise - Promise that resolves to final content (JSX element)
 * @param options - Streaming render options
 * @returns Response object with streaming HTML content
 *
 * @example
 * const loadingElement = <Loading params={{}} searchParams={{}} pathname="/dashboard" />
 * const contentPromise = (async () => {
 *   const data = await loader()
 *   return <Page {...data} />
 * })()
 *
 * return renderStream(loadingElement, contentPromise)
 */
export function renderStream(
  loadingElement: unknown,
  contentPromise: Promise<unknown>,
  options: StreamRenderOptions = {}
): Response {
  const { status = 200, headers = {} } = options

  // Create a ReadableStream that sends loading UI first, then final content
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder()

      try {
        // Send loading UI immediately
        const loadingHtml = String(loadingElement)
        // Wrap loading content in a container that can be replaced
        const loadingWrapper = `<!DOCTYPE html><div id="__cloudwerk_loading">${loadingHtml}</div>`
        controller.enqueue(encoder.encode(loadingWrapper))

        // Wait for content to be ready
        const finalElement = await contentPromise

        // Send final content with script to replace loading UI
        const finalHtml = String(finalElement)
        // The final content replaces everything - this is a full page replacement
        // Note: innerHTML is safe here because finalHtml is server-rendered content we control
        const replacementScript = `
<script>
(function() {
  var loading = document.getElementById('__cloudwerk_loading');
  if (loading) {
    var content = document.getElementById('__cloudwerk_content');
    if (content) {
      document.body.innerHTML = content.innerHTML;
    }
  }
})();
</script>
<div id="__cloudwerk_content" style="display:none">${finalHtml}</div>
`
        controller.enqueue(encoder.encode(replacementScript))
        controller.close()
      } catch (error) {
        // Send error message if content promise rejects
        const errorMessage = error instanceof Error ? error.message : String(error)
        const errorHtml = `<div style="color:red;padding:20px;">Error loading content: ${errorMessage}</div>`
        controller.enqueue(encoder.encode(errorHtml))
        controller.close()
      }
    },
  })

  return new Response(stream, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      ...headers,
    },
  })
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
 * Render a JSX element to a streaming Response using native progressive streaming.
 *
 * This uses Hono's renderToReadableStream for native support of React-style
 * Suspense boundaries. Content inside Suspense components will be progressively
 * streamed as their async content resolves.
 *
 * Unlike renderStream() which uses a loading-swap pattern, this function
 * provides true progressive streaming where:
 * - The initial shell is sent immediately
 * - Suspense fallbacks are shown while async content loads
 * - Async content is streamed in-place as it resolves
 * - No JavaScript is required for the initial render
 *
 * @param element - Hono JSX element to render (may contain Suspense boundaries)
 * @param options - Render options
 * @returns Promise resolving to Response with streaming HTML content
 *
 * @example
 * // In a route handler
 * import { Suspense } from 'hono/jsx/streaming'
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
 *   return renderToStream(<Page />)
 * }
 */
export async function renderToStream(
  element: unknown,
  options: RenderToStreamOptions = {}
): Promise<Response> {
  const { status = 200, headers = {}, doctype = true } = options

  // Use Hono's native streaming renderer
  // The element must be a Hono JSX element (JSXNode or HtmlEscapedString)
  const contentStream = renderToReadableStream(element as Parameters<typeof renderToReadableStream>[0])

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
