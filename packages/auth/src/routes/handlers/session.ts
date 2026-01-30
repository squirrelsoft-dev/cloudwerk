/**
 * @cloudwerk/auth - Session Route Handler
 *
 * GET /auth/session - Returns current session information.
 */

import type { AuthRouteContext, SessionResponse } from '../types.js'

/**
 * Handle GET /auth/session request.
 *
 * Returns the current user session as JSON.
 * If not authenticated, returns { user: null, expires: null }.
 *
 * @param ctx - Auth route context
 * @returns JSON response with session data
 */
export async function handleSession(
  ctx: AuthRouteContext
): Promise<Response> {
  const { user, session } = ctx

  const response: SessionResponse = {
    user: user
      ? {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        }
      : null,
    expires: session?.expiresAt?.toISOString() ?? null,
  }

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, max-age=0',
      ...Object.fromEntries(ctx.responseHeaders),
    },
  })
}
