/**
 * @cloudwerk/auth - Passkey Authenticate Verify Handler
 *
 * POST /auth/passkey/authenticate/verify - Verify passkey authentication response.
 */

import type { PasskeyProvider, User } from '../../types.js'
import type { AuthRouteContext } from '../types.js'
import type {
  ChallengeStorage,
  CredentialStorage,
  AuthenticationResponse,
} from '../../providers/webauthn/types.js'
import { verifyAuthentication } from '../../providers/webauthn/authentication.js'

/**
 * Request body for authentication verification.
 */
export interface PasskeyAuthenticateVerifyRequest {
  /** Authentication response from navigator.credentials.get() */
  credential: AuthenticationResponse
}

/**
 * Extended auth context with passkey-specific dependencies.
 */
export interface PasskeyAuthContext extends AuthRouteContext {
  /** Challenge storage (from KV) */
  challengeStorage?: ChallengeStorage

  /** Credential storage (from D1) */
  credentialStorage?: CredentialStorage
}

/**
 * Handle POST /auth/passkey/authenticate/verify request.
 *
 * Verifies the WebAuthn authentication response and creates a session.
 *
 * @param ctx - Auth route context with passkey dependencies
 * @param providerId - Passkey provider ID
 * @returns JSON response with verification result
 *
 * @example
 * ```typescript
 * // Client-side usage:
 * const credential = await navigator.credentials.get({ publicKey: options })
 *
 * const response = await fetch('/auth/passkey/authenticate/verify', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({
 *     credential: {
 *       id: credential.id,
 *       rawId: base64UrlEncode(credential.rawId),
 *       response: {
 *         clientDataJSON: base64UrlEncode(credential.response.clientDataJSON),
 *         authenticatorData: base64UrlEncode(credential.response.authenticatorData),
 *         signature: base64UrlEncode(credential.response.signature),
 *         userHandle: credential.response.userHandle
 *           ? base64UrlEncode(credential.response.userHandle)
 *           : null,
 *       },
 *       type: credential.type,
 *     },
 *   }),
 * })
 * ```
 */
export async function handlePasskeyAuthenticateVerify(
  ctx: PasskeyAuthContext,
  providerId: string
): Promise<Response> {
  const { providers, request, url, sessionManager, config, challengeStorage, credentialStorage } = ctx

  // Get passkey provider
  const provider = providers.get(providerId)
  if (!provider || provider.type !== 'passkey') {
    return new Response(
      JSON.stringify({ error: 'Passkey provider not found' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const passkeyProvider = provider as PasskeyProvider

  // Validate required dependencies
  if (!challengeStorage) {
    return new Response(
      JSON.stringify({ error: 'Challenge storage not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  if (!credentialStorage) {
    return new Response(
      JSON.stringify({ error: 'Credential storage not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Parse request body
  let body: PasskeyAuthenticateVerifyRequest
  try {
    body = await request.json()
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid request body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Validate credential
  if (!body.credential || !body.credential.id || !body.credential.response) {
    return new Response(
      JSON.stringify({ error: 'Invalid credential' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Look up the credential by ID
  const storedCredential = await credentialStorage.getCredential(body.credential.id)
  if (!storedCredential) {
    return new Response(
      JSON.stringify({ error: 'Credential not found' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Build WebAuthn config
  const webauthnConfig = {
    rpId: passkeyProvider.rpId,
    rpName: passkeyProvider.rpName,
    origin: passkeyProvider.origin,
    timeout: passkeyProvider.timeout,
    userVerification: passkeyProvider.userVerification,
  }

  // Verify authentication
  const result = await verifyAuthentication(
    webauthnConfig,
    body.credential,
    storedCredential,
    challengeStorage
  )

  if (!result.verified || !result.authenticationInfo) {
    return new Response(
      JSON.stringify({ error: 'Authentication verification failed', verified: false }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Update credential counter and last used timestamp
  try {
    await credentialStorage.updateCredential(storedCredential.id, {
      counter: result.authenticationInfo.newCounter,
      lastUsedAt: new Date(),
      backedUp: result.authenticationInfo.credentialBackedUp,
    })
  } catch (error) {
    console.error('Failed to update credential:', error)
    // Continue anyway - the authentication was successful
  }

  // Run signIn callback if configured
  if (config.callbacks?.signIn) {
    try {
      // Create a minimal user object for the callback
      const user: User = {
        id: storedCredential.userId,
        email: null,
        emailVerified: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const callbackResult = await config.callbacks.signIn({
        user,
        account: {
          id: storedCredential.id,
          userId: storedCredential.userId,
          type: 'passkey',
          provider: providerId,
          providerAccountId: storedCredential.id,
        },
        credentials: { credentialId: storedCredential.id },
      })

      if (callbackResult === false) {
        return new Response(
          JSON.stringify({ error: 'Sign-in not allowed', verified: false }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        )
      }

      if (typeof callbackResult === 'string') {
        return Response.redirect(callbackResult, 302)
      }
    } catch (error) {
      console.error('signIn callback error:', error)
      return new Response(
        JSON.stringify({ error: 'Sign-in callback failed', verified: false }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }
  }

  // Create session
  const session = await sessionManager.createSession(storedCredential.userId)

  // Build response with session cookie
  const headers = new Headers({
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  })

  // Set session cookie
  const cookieParts = [
    `cloudwerk.session-token=${session.sessionToken}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
  ]
  if (url.protocol === 'https:') {
    cookieParts.push('Secure')
  }
  headers.set('Set-Cookie', cookieParts.join('; '))

  // Copy response headers from context
  for (const [key, value] of ctx.responseHeaders) {
    if (key.toLowerCase() !== 'set-cookie') {
      headers.set(key, value)
    }
  }

  return new Response(
    JSON.stringify({
      verified: true,
      userId: storedCredential.userId,
    }),
    { status: 200, headers }
  )
}
