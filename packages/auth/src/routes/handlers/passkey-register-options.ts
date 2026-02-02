/**
 * @cloudwerk/auth - Passkey Register Options Handler
 *
 * POST /auth/passkey/register/options - Generate registration options for passkey creation.
 */

import type { PasskeyProvider, User } from '../../types.js'
import type { AuthRouteContext } from '../types.js'
import type {
  ChallengeStorage,
  CredentialStorage,
  COSEAlgorithmIdentifier,
} from '../../providers/webauthn/types.js'
import { generateRegistrationOptions } from '../../providers/webauthn/registration.js'

/**
 * Request body for registration options.
 */
export interface PasskeyRegisterOptionsRequest {
  /** User's email address */
  email: string

  /** User's display name (optional, defaults to email) */
  name?: string
}

/**
 * Extended auth context with passkey-specific dependencies.
 */
export interface PasskeyAuthContext extends AuthRouteContext {
  /** Challenge storage (from KV) */
  challengeStorage?: ChallengeStorage

  /** Credential storage (from D1) */
  credentialStorage?: CredentialStorage

  /** User adapter for finding/creating users */
  userAdapter?: {
    getUserByEmail(email: string): Promise<User | null>
    createUser(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User>
  }
}

/**
 * Handle POST /auth/passkey/register/options request.
 *
 * Generates WebAuthn registration options for passkey creation.
 * The client should pass these options to navigator.credentials.create().
 *
 * @param ctx - Auth route context with passkey dependencies
 * @param providerId - Passkey provider ID
 * @returns JSON response with registration options
 *
 * @example
 * ```typescript
 * // Client-side usage:
 * const response = await fetch('/auth/passkey/register/options', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({ email: 'user@example.com', name: 'John Doe' }),
 * })
 * const options = await response.json()
 *
 * // Pass to WebAuthn API
 * const credential = await navigator.credentials.create({
 *   publicKey: {
 *     ...options,
 *     challenge: base64UrlDecode(options.challenge),
 *     user: {
 *       ...options.user,
 *       id: base64UrlDecode(options.user.id),
 *     },
 *   },
 * })
 * ```
 */
export async function handlePasskeyRegisterOptions(
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

  if (!userAdapter) {
    return new Response(
      JSON.stringify({ error: 'User adapter not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Parse request body
  let body: PasskeyRegisterOptionsRequest
  try {
    body = await request.json()
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid request body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Validate email
  if (!body.email || typeof body.email !== 'string') {
    return new Response(
      JSON.stringify({ error: 'Email is required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const email = body.email.toLowerCase().trim()
  const displayName = body.name || email

  // Find or create user
  let user = await userAdapter.getUserByEmail(email)

  if (!user) {
    // Create a new user
    user = await userAdapter.createUser({
      email,
      emailVerified: null,
      name: displayName,
    })
  }

  // Get user's existing credentials to exclude
  const existingCredentials = await credentialStorage.getCredentialsByUser(user.id)

  // Build WebAuthn config from passkey provider settings
  const webauthnConfig = {
    rpId: passkeyProvider.rpId,
    rpName: passkeyProvider.rpName,
    origin: passkeyProvider.origin,
    timeout: passkeyProvider.timeout,
    authenticatorAttachment: passkeyProvider.authenticatorAttachment,
    residentKey: passkeyProvider.residentKey,
    userVerification: passkeyProvider.userVerification,
    attestation: passkeyProvider.attestation,
    supportedAlgorithms: passkeyProvider.supportedAlgorithms as COSEAlgorithmIdentifier[] | undefined,
  }

  // Generate registration options
  const options = await generateRegistrationOptions(
    webauthnConfig,
    {
      id: user.id,
      name: email,
      displayName: displayName,
    },
    existingCredentials,
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
