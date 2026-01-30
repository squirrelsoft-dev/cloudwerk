/**
 * @cloudwerk/auth - Sign-out Route Handler
 *
 * GET/POST /auth/signout - Handle sign-out
 */

import type { AuthRouteContext } from '../types.js'
import { verifyCSRFToken, extractCSRFToken } from './csrf.js'

/**
 * Handle GET /auth/signout request.
 *
 * Returns sign-out confirmation page or performs sign-out for GET requests.
 *
 * @param ctx - Auth route context
 * @returns Response
 */
export async function handleSignOutGet(
  ctx: AuthRouteContext
): Promise<Response> {
  const { config, url, session, sessionManager } = ctx

  // Get callback URL
  const callbackUrl = url.searchParams.get('callbackUrl') ?? '/'

  // If custom sign-out page configured, redirect to it
  if (config.pages?.signOut) {
    const signOutUrl = new URL(config.pages.signOut, url.origin)
    signOutUrl.searchParams.set('callbackUrl', callbackUrl)
    return Response.redirect(signOutUrl.toString(), 302)
  }

  // Perform sign-out directly for GET requests (less secure, for convenience)
  if (session) {
    await sessionManager.invalidateSession(session.sessionToken)
  }

  // Run signOut event if configured
  if (config.events?.signOut && session) {
    try {
      await config.events.signOut({ session })
    } catch (error) {
      console.error('signOut event error:', error)
    }
  }

  // Clear session cookie
  const headers = new Headers()
  headers.set('Location', callbackUrl)
  headers.set(
    'Set-Cookie',
    'cloudwerk.session-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax'
  )

  return new Response(null, { status: 302, headers })
}

/**
 * Handle POST /auth/signout request.
 *
 * @param ctx - Auth route context
 * @returns Response
 */
export async function handleSignOutPost(
  ctx: AuthRouteContext
): Promise<Response> {
  const { config, request, session, sessionManager } = ctx

  // Verify CSRF token for POST requests
  if (config.csrf?.enabled !== false) {
    const csrfToken = await extractCSRFToken(request)
    if (!csrfToken || !verifyCSRFToken(request, csrfToken)) {
      return new Response(JSON.stringify({ error: 'Invalid CSRF token' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }

  // Get callback URL from body
  let callbackUrl = '/'
  try {
    const contentType = request.headers.get('Content-Type') ?? ''
    if (contentType.includes('application/json')) {
      const body = await request.json()
      callbackUrl = body.callbackUrl ?? '/'
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData()
      callbackUrl = formData.get('callbackUrl')?.toString() ?? '/'
    }
  } catch {
    // Use default callback URL
  }

  // Invalidate session
  if (session) {
    await sessionManager.invalidateSession(session.sessionToken)
  }

  // Run signOut event if configured
  if (config.events?.signOut && session) {
    try {
      await config.events.signOut({ session })
    } catch (error) {
      console.error('signOut event error:', error)
    }
  }

  // Clear session cookie
  const headers = new Headers()
  headers.set('Location', callbackUrl)
  headers.set(
    'Set-Cookie',
    'cloudwerk.session-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax'
  )

  // Check if JSON response is expected
  const accept = request.headers.get('Accept') ?? ''
  if (accept.includes('application/json')) {
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': headers.get('Set-Cookie')!,
      },
    })
  }

  return new Response(null, { status: 302, headers })
}
