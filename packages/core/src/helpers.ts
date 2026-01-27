/**
 * @cloudwerk/core - Response Helpers
 *
 * Convenience functions for creating HTTP responses.
 * Re-exports Hono for framework access.
 */

// Re-export Hono for convenience
export { Hono } from 'hono'
export type { Context, MiddlewareHandler, Next } from 'hono'

// ============================================================================
// JSON Response Helpers
// ============================================================================

/**
 * Create a JSON response with proper headers.
 *
 * @param data - Data to serialize as JSON
 * @param status - HTTP status code (default: 200)
 * @param headers - Additional headers
 * @returns Response object
 *
 * @example
 * // In a route handler:
 * return json({ user: { id: 1, name: 'John' } })
 *
 * // With status:
 * return json({ error: 'Not found' }, 404)
 *
 * // With custom headers:
 * return json({ data }, 200, { 'X-Custom': 'value' })
 */
export function json<T>(
  data: T,
  status: number = 200,
  headers: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  })
}

/**
 * Create a JSON response for a successful creation.
 *
 * @param data - Created resource data
 * @param headers - Additional headers
 * @returns Response with 201 status
 */
export function created<T>(data: T, headers: Record<string, string> = {}): Response {
  return json(data, 201, headers)
}

/**
 * Create a JSON response for a successful deletion (no content).
 *
 * @returns Response with 204 status
 */
export function noContent(): Response {
  return new Response(null, { status: 204 })
}

// ============================================================================
// Redirect Helpers
// ============================================================================

/**
 * Create a redirect response.
 *
 * @param url - URL to redirect to
 * @param status - HTTP status code (default: 302 temporary redirect)
 * @returns Response object
 *
 * @example
 * // Temporary redirect:
 * return redirect('/login')
 *
 * // Permanent redirect:
 * return redirect('/new-page', 301)
 */
export function redirect(url: string, status: 301 | 302 | 303 | 307 | 308 = 302): Response {
  return new Response(null, {
    status,
    headers: {
      Location: url,
    },
  })
}

/**
 * Create a permanent redirect response (301).
 *
 * @param url - URL to redirect to
 * @returns Response with 301 status
 */
export function permanentRedirect(url: string): Response {
  return redirect(url, 301)
}

// ============================================================================
// HTML Response Helpers
// ============================================================================

/**
 * Create an HTML response.
 *
 * @param content - HTML content string
 * @param status - HTTP status code (default: 200)
 * @param headers - Additional headers
 * @returns Response object
 *
 * @example
 * return html('<h1>Hello World</h1>')
 *
 * // With status:
 * return html('<h1>Not Found</h1>', 404)
 */
export function html(
  content: string,
  status: number = 200,
  headers: Record<string, string> = {}
): Response {
  return new Response(content, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      ...headers,
    },
  })
}

// ============================================================================
// Error Response Helpers
// ============================================================================

/**
 * Create a 404 Not Found JSON response.
 *
 * @param message - Error message (default: 'Not Found')
 * @returns Response with 404 status
 *
 * @example
 * // Use in route handlers (API routes) to return a 404 response
 * if (!user) {
 *   return notFoundResponse('User not found')
 * }
 *
 * @see {@link notFound} from `@cloudwerk/core` for throwing NotFoundError in loaders/actions
 * which triggers the not-found boundary
 */
export function notFoundResponse(message: string = 'Not Found'): Response {
  return json({ error: message }, 404)
}

/**
 * Create a 400 Bad Request response.
 *
 * @param message - Error message
 * @param details - Additional error details
 * @returns Response with 400 status
 */
export function badRequest(
  message: string = 'Bad Request',
  details?: Record<string, unknown>
): Response {
  return json({ error: message, ...details }, 400)
}

/**
 * Create a 401 Unauthorized response.
 *
 * @param message - Error message
 * @returns Response with 401 status
 */
export function unauthorized(message: string = 'Unauthorized'): Response {
  return json({ error: message }, 401)
}

/**
 * Create a 403 Forbidden response.
 *
 * @param message - Error message
 * @returns Response with 403 status
 */
export function forbidden(message: string = 'Forbidden'): Response {
  return json({ error: message }, 403)
}

/**
 * Create a 500 Internal Server Error response.
 *
 * @param message - Error message (default: generic error)
 * @returns Response with 500 status
 *
 * @example
 * try {
 *   // ... some operation
 * } catch (error) {
 *   return serverError('Database connection failed')
 * }
 */
export function serverError(message: string = 'Internal Server Error'): Response {
  return json({ error: message }, 500)
}

/**
 * Create a 422 Unprocessable Entity response (validation error).
 *
 * @param errors - Validation errors
 * @returns Response with 422 status
 *
 * @example
 * if (!isValidEmail(email)) {
 *   return validationError({ email: 'Invalid email format' })
 * }
 */
export function validationError(errors: Record<string, string | string[]>): Response {
  return json({ error: 'Validation Error', errors }, 422)
}

// ============================================================================
// Stream Response Helpers
// ============================================================================

/**
 * Create a streaming response.
 *
 * @param stream - ReadableStream to send
 * @param contentType - Content type header
 * @param headers - Additional headers
 * @returns Response object
 */
export function stream(
  stream: ReadableStream,
  contentType: string = 'application/octet-stream',
  headers: Record<string, string> = {}
): Response {
  return new Response(stream, {
    headers: {
      'Content-Type': contentType,
      ...headers,
    },
  })
}

/**
 * Create a Server-Sent Events response.
 *
 * @param stream - ReadableStream of events
 * @returns Response configured for SSE
 */
export function sse(stream: ReadableStream): Response {
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}

// ============================================================================
// Text Response Helpers
// ============================================================================

/**
 * Create a plain text response.
 *
 * @param content - Text content
 * @param status - HTTP status code (default: 200)
 * @returns Response object
 */
export function text(content: string, status: number = 200): Response {
  return new Response(content, {
    status,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  })
}

// ============================================================================
// Cache Control Helpers
// ============================================================================

/**
 * Add cache control headers to a response.
 *
 * @param response - Response to modify
 * @param maxAge - Cache max-age in seconds
 * @param options - Additional cache options
 * @returns New response with cache headers
 */
export function withCache(
  response: Response,
  maxAge: number,
  options: {
    public?: boolean
    private?: boolean
    staleWhileRevalidate?: number
    staleIfError?: number
  } = {}
): Response {
  const directives: string[] = []

  if (options.public) {
    directives.push('public')
  } else if (options.private) {
    directives.push('private')
  }

  directives.push(`max-age=${maxAge}`)

  if (options.staleWhileRevalidate) {
    directives.push(`stale-while-revalidate=${options.staleWhileRevalidate}`)
  }

  if (options.staleIfError) {
    directives.push(`stale-if-error=${options.staleIfError}`)
  }

  const headers = new Headers(response.headers)
  headers.set('Cache-Control', directives.join(', '))

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

/**
 * Add no-cache headers to a response.
 *
 * @param response - Response to modify
 * @returns New response with no-cache headers
 */
export function noCache(response: Response): Response {
  const headers = new Headers(response.headers)
  headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
  headers.set('Pragma', 'no-cache')
  headers.set('Expires', '0')

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}
