/**
 * @cloudwerk/auth - Passkey Register Verify Handler
 *
 * POST /auth/passkey/register/verify - Verify passkey registration response.
 */

import type { PasskeyProvider, User } from '../../types.js'
import type { AuthRouteContext } from '../types.js'
import type {
  ChallengeStorage,
  CredentialStorage,
  RegistrationResponse,
} from '../../providers/webauthn/types.js'
import { verifyRegistration } from '../../providers/webauthn/registration.js'
import { base64UrlDecode } from '../../providers/oauth/pkce.js'

/**
 * Request body for registration verification.
 */
export interface PasskeyRegisterVerifyRequest {
  /** Registration response from navigator.credentials.create() */
  credential: RegistrationResponse
}

/**
 * Extended auth context with passkey-specific dependencies.
 */
export interface PasskeyAuthContext extends AuthRouteContext {
  /** Challenge storage (from KV) */
  challengeStorage?: ChallengeStorage

  /** Credential storage (from D1) */
  credentialStorage?: CredentialStorage

  /** User adapter for finding users */
  userAdapter?: {
    getUser(id: string): Promise<User | null>
  }
}

/**
 * Handle POST /auth/passkey/register/verify request.
 *
 * Verifies the WebAuthn registration response and stores the credential.
 * Creates a session on success.
 *
 * @param ctx - Auth route context with passkey dependencies
 * @param providerId - Passkey provider ID
 * @returns JSON response with verification result
 *
 * @example
 * ```typescript
 * // Client-side usage:
 * const credential = await navigator.credentials.create({ publicKey: options })
 *
 * const response = await fetch('/auth/passkey/register/verify', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({
 *     credential: {
 *       id: credential.id,
 *       rawId: base64UrlEncode(credential.rawId),
 *       response: {
 *         clientDataJSON: base64UrlEncode(credential.response.clientDataJSON),
 *         attestationObject: base64UrlEncode(credential.response.attestationObject),
 *         transports: credential.response.getTransports?.(),
 *       },
 *       type: credential.type,
 *     },
 *   }),
 * })
 * ```
 */
export async function handlePasskeyRegisterVerify(
  ctx: PasskeyAuthContext,
  providerId: string
): Promise<Response> {
  const { providers, request, url, sessionManager, challengeStorage, credentialStorage } = ctx

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
  let body: PasskeyRegisterVerifyRequest
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

  // Build WebAuthn config
  const webauthnConfig = {
    rpId: passkeyProvider.rpId,
    rpName: passkeyProvider.rpName,
    origin: passkeyProvider.origin,
    timeout: passkeyProvider.timeout,
    userVerification: passkeyProvider.userVerification,
  }

  // Verify registration
  const result = await verifyRegistration(
    webauthnConfig,
    body.credential,
    challengeStorage
  )

  if (!result.verified || !result.registrationInfo) {
    return new Response(
      JSON.stringify({ error: 'Registration verification failed', verified: false }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Get the user ID - either from authenticated session or from request body
  // The challenge storage stores the userId alongside the challenge during generateRegistrationOptions
  // but the challenge is consumed during verification. We require userId in the request.
  let userId: string | undefined = ctx.user?.id

  // If not authenticated, check if userId was provided in request
  // The client sends the base64url-encoded userId from options.user.id, so we need to decode it
  if (!userId && 'userId' in body) {
    const encodedUserId = (body as { userId?: string }).userId
    if (encodedUserId) {
      // Decode from base64url back to the original UUID string
      const decoded = base64UrlDecode(encodedUserId)
      userId = new TextDecoder().decode(decoded)
    }
  }

  if (!userId) {
    return new Response(
      JSON.stringify({ error: 'User ID is required for registration' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Store the credential
  try {
    await credentialStorage.createCredential({
      id: result.registrationInfo.credentialID,
      userId,
      publicKey: result.registrationInfo.credentialPublicKey,
      counter: result.registrationInfo.counter,
      aaguid: result.registrationInfo.aaguid,
      transports: result.registrationInfo.transports,
      backedUp: result.registrationInfo.credentialBackedUp,
      deviceType: result.registrationInfo.credentialDeviceType,
      createdAt: new Date(),
    })
  } catch (error) {
    console.error('Failed to store credential:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to store credential' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Create session
  const session = await sessionManager.createSession(userId)

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
      credentialId: result.registrationInfo.credentialID,
    }),
    { status: 200, headers }
  )
}
