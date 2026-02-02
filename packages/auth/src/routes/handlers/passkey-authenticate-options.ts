/**
 * @cloudwerk/auth - Passkey Authenticate Options Handler
 *
 * POST /auth/passkey/authenticate/options - Generate authentication options.
 */

import type { PasskeyProvider, User } from '../../types.js'
import type { AuthRouteContext } from '../types.js'
import type {
  ChallengeStorage,
  CredentialStorage,
} from '../../providers/webauthn/types.js'
import { generateAuthenticationOptions } from '../../providers/webauthn/authentication.js'

/**
 * Request body for authentication options.
 */
export interface PasskeyAuthenticateOptionsRequest {
  /** User's email address (optional for usernameless/discoverable credentials) */
  email?: string
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
    getUserByEmail(email: string): Promise<User | null>
  }
}

/**
 * Handle POST /auth/passkey/authenticate/options request.
 *
 * Generates WebAuthn authentication options for passkey assertion.
 * The client should pass these options to navigator.credentials.get().
 *
 * @param ctx - Auth route context with passkey dependencies
 * @param providerId - Passkey provider ID
 * @returns JSON response with authentication options
 *
 * @example
 * ```typescript
 * // Client-side usage (with email):
 * const response = await fetch('/auth/passkey/authenticate/options', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({ email: 'user@example.com' }),
 * })
 * const options = await response.json()
 *
 * // For usernameless/discoverable credentials:
 * const response = await fetch('/auth/passkey/authenticate/options', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({}),
 * })
 *
 * // Pass to WebAuthn API
 * const credential = await navigator.credentials.get({
 *   publicKey: {
 *     ...options,
 *     challenge: base64UrlDecode(options.challenge),
 *     allowCredentials: options.allowCredentials?.map(c => ({
 *       ...c,
 *       id: base64UrlDecode(c.id),
 *     })),
 *   },
 * })
 * ```
 */
export async function handlePasskeyAuthenticateOptions(
  ctx: PasskeyAuthContext,
  providerId: string
): Promise<Response> {
  const { providers, request, challengeStorage, credentialStorage, userAdapter } = ctx

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
  let body: PasskeyAuthenticateOptionsRequest
  try {
    body = await request.json()
  } catch {
    // Allow empty body for usernameless authentication
    body = {}
  }

  // Get user credentials if email provided
  let userCredentials: Awaited<ReturnType<CredentialStorage['getCredentialsByUser']>> = []

  if (body.email && userAdapter) {
    const email = body.email.toLowerCase().trim()
    const user = await userAdapter.getUserByEmail(email)

    if (user) {
      userCredentials = await credentialStorage.getCredentialsByUser(user.id)
    }
    // If user not found, we still return options for usernameless flow
  }

  // Build WebAuthn config
  const webauthnConfig = {
    rpId: passkeyProvider.rpId,
    rpName: passkeyProvider.rpName,
    origin: passkeyProvider.origin,
    timeout: passkeyProvider.timeout,
    userVerification: passkeyProvider.userVerification,
  }

  // Generate authentication options
  const options = await generateAuthenticationOptions(
    webauthnConfig,
    userCredentials,
    challengeStorage
  )

  return new Response(JSON.stringify(options), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...Object.fromEntries(ctx.responseHeaders),
    },
  })
}
