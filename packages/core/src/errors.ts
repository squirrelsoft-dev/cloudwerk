/**
 * @cloudwerk/core - Error Classes
 *
 * Custom error classes for loader functions to control response behavior.
 */

// ============================================================================
// NotFoundError
// ============================================================================

/**
 * Error that triggers a 404 Not Found response.
 *
 * Throw this from a loader function to return a 404 response.
 * The route handler will catch this error and call `c.notFound()`.
 *
 * @example
 * ```typescript
 * export async function loader({ params }: LoaderArgs) {
 *   const user = await getUser(params.id)
 *   if (!user) {
 *     throw new NotFoundError('User not found')
 *   }
 *   return { user }
 * }
 * ```
 */
export class NotFoundError extends Error {
  readonly name = 'NotFoundError' as const

  /**
   * Create a new NotFoundError.
   *
   * @param message - Optional error message (defaults to 'Not Found')
   */
  constructor(message: string = 'Not Found') {
    super(message)

    // Maintains proper stack trace for where the error was thrown (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, NotFoundError)
    }
  }
}

// ============================================================================
// RedirectError
// ============================================================================

/**
 * Error that triggers an HTTP redirect response.
 *
 * Throw this from a loader function to redirect to a different URL.
 * The route handler will catch this error and call `c.redirect()`.
 *
 * @example
 * ```typescript
 * export async function loader({ params, context }: LoaderArgs) {
 *   const session = context.req.cookie('session')
 *   if (!session) {
 *     throw new RedirectError('/login')
 *   }
 *
 *   // Permanent redirect for moved content
 *   if (params.slug === 'old-post') {
 *     throw new RedirectError('/blog/new-post', 301)
 *   }
 *
 *   return { data: 'authenticated' }
 * }
 * ```
 */
export class RedirectError extends Error {
  readonly name = 'RedirectError' as const

  /**
   * The URL to redirect to.
   */
  readonly url: string

  /**
   * HTTP status code for the redirect (default: 302).
   */
  readonly status: number

  /**
   * Create a new RedirectError.
   *
   * @param url - The URL to redirect to
   * @param status - HTTP status code (default: 302 for temporary redirect)
   */
  constructor(url: string, status: number = 302) {
    super(`Redirect to ${url}`)
    this.url = url
    this.status = status

    // Maintains proper stack trace for where the error was thrown (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, RedirectError)
    }
  }
}
