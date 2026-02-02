/**
 * @cloudwerk/auth - Client Actions
 *
 * Client-side authentication actions.
 */

import type {
  SignInOptions,
  SignOutOptions,
  SignInResult,
  SignOutResult,
  SessionResponse,
  CSRFResponse,
  ClientProvider,
} from './types.js'

// ============================================================================
// Configuration
// ============================================================================

/**
 * Auth configuration.
 */
export interface AuthConfig {
  /** Base path for auth endpoints */
  basePath: string
}

let config: AuthConfig = {
  basePath: '/auth',
}

/**
 * Configure auth client.
 *
 * @param options - Configuration options
 */
export function configureAuth(options: Partial<AuthConfig>): void {
  config = { ...config, ...options }
}

// ============================================================================
// Session Actions
// ============================================================================

/**
 * Fetch current session from server.
 *
 * @returns Session data or null
 *
 * @example
 * ```typescript
 * const session = await getSession()
 * if (session?.user) {
 *   console.log('Logged in as:', session.user.email)
 * }
 * ```
 */
export async function getSession(): Promise<SessionResponse | null> {
  try {
    const response = await fetch(`${config.basePath}/session`, {
      credentials: 'include',
    })

    if (!response.ok) {
      return null
    }

    return await response.json()
  } catch {
    return null
  }
}

/**
 * Get CSRF token.
 *
 * @returns CSRF token or null
 */
export async function getCsrfToken(): Promise<string | null> {
  try {
    const response = await fetch(`${config.basePath}/csrf`, {
      credentials: 'include',
    })

    if (!response.ok) {
      return null
    }

    const data: CSRFResponse = await response.json()
    return data.csrfToken
  } catch {
    return null
  }
}

/**
 * Get available providers.
 *
 * @returns Providers map
 */
export async function getProviders(): Promise<Record<string, ClientProvider> | null> {
  try {
    const response = await fetch(`${config.basePath}/providers`, {
      credentials: 'include',
    })

    if (!response.ok) {
      return null
    }

    return await response.json()
  } catch {
    return null
  }
}

// ============================================================================
// Sign-in Actions
// ============================================================================

/**
 * Sign in with a provider.
 *
 * @param provider - Provider ID (e.g., 'github', 'google', 'credentials')
 * @param options - Sign-in options
 * @returns Sign-in result
 *
 * @example
 * ```typescript
 * // OAuth sign-in (redirects)
 * await signIn('github')
 *
 * // Credentials sign-in
 * const result = await signIn('credentials', {
 *   credentials: {
 *     email: 'user@example.com',
 *     password: 'password123',
 *   },
 *   redirect: false,
 * })
 *
 * if (!result.ok) {
 *   console.error('Sign-in failed:', result.error)
 * }
 * ```
 */
export async function signIn(
  provider: string,
  options: SignInOptions = {}
): Promise<SignInResult> {
  const { callbackUrl = window.location.href, credentials, redirect = true } = options

  // For OAuth/OIDC providers, redirect to sign-in URL
  if (!credentials) {
    const url = new URL(`${config.basePath}/signin/${provider}`, window.location.origin)
    url.searchParams.set('callbackUrl', callbackUrl)

    if (redirect) {
      window.location.href = url.toString()
      return { ok: true, url: url.toString() }
    }

    return { ok: true, url: url.toString() }
  }

  // For credentials provider, POST to callback
  try {
    const csrfToken = await getCsrfToken()

    const response = await fetch(`${config.basePath}/callback/${provider}`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        ...credentials,
        csrfToken,
        callbackUrl,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        ok: false,
        error: data.error ?? 'Sign-in failed',
      }
    }

    if (redirect && data.url) {
      window.location.href = data.url
    }

    return {
      ok: true,
      url: data.url,
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Sign-in failed',
    }
  }
}

// ============================================================================
// Sign-out Actions
// ============================================================================

/**
 * Sign out.
 *
 * @param options - Sign-out options
 * @returns Sign-out result
 *
 * @example
 * ```typescript
 * // Sign out and redirect
 * await signOut()
 *
 * // Sign out without redirect
 * const result = await signOut({ redirect: false })
 * ```
 */
export async function signOut(options: SignOutOptions = {}): Promise<SignOutResult> {
  const { callbackUrl = '/', redirect = true } = options

  try {
    const csrfToken = await getCsrfToken()

    const response = await fetch(`${config.basePath}/signout`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        csrfToken,
        callbackUrl,
      }),
    })

    if (!response.ok) {
      return { ok: false }
    }

    if (redirect) {
      window.location.href = callbackUrl
    }

    return { ok: true, url: callbackUrl }
  } catch {
    return { ok: false }
  }
}

// ============================================================================
// Passkey/WebAuthn Actions
// ============================================================================

/**
 * Passkey registration options.
 */
export interface PasskeyRegisterOptions {
  /** User's email address */
  email: string
  /** User's display name (optional) */
  name?: string
  /** Passkey provider ID (default: 'passkey') */
  providerId?: string
  /** Redirect URL after registration */
  callbackUrl?: string
  /** Whether to redirect after registration */
  redirect?: boolean
}

/**
 * Passkey registration result.
 */
export interface PasskeyRegisterResult {
  ok: boolean
  error?: string
  credentialId?: string
  userId?: string
}

/**
 * Passkey authentication options.
 */
export interface PasskeyAuthenticateOptions {
  /** User's email address (optional for usernameless/discoverable) */
  email?: string
  /** Passkey provider ID (default: 'passkey') */
  providerId?: string
  /** Redirect URL after authentication */
  callbackUrl?: string
  /** Whether to redirect after authentication */
  redirect?: boolean
}

/**
 * Passkey authentication result.
 */
export interface PasskeyAuthenticateResult {
  ok: boolean
  error?: string
  userId?: string
}

/**
 * Register a new passkey for the user.
 *
 * This performs the full WebAuthn registration flow:
 * 1. Gets registration options from server
 * 2. Calls navigator.credentials.create() to create credential
 * 3. Sends credential to server for verification
 * 4. Creates a session on success
 *
 * @param options - Registration options
 * @returns Registration result
 *
 * @example
 * ```typescript
 * const result = await registerPasskey({
 *   email: 'user@example.com',
 *   name: 'John Doe',
 * })
 *
 * if (result.ok) {
 *   console.log('Passkey registered!')
 * } else {
 *   console.error('Registration failed:', result.error)
 * }
 * ```
 */
export async function registerPasskey(
  options: PasskeyRegisterOptions
): Promise<PasskeyRegisterResult> {
  const { email, name, providerId: _providerId = 'passkey', callbackUrl = '/', redirect = true } = options

  try {
    // Step 1: Get registration options from server
    const optionsResponse = await fetch(
      `${config.basePath}/passkey/register/options`,
      {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name }),
      }
    )

    if (!optionsResponse.ok) {
      const error = await optionsResponse.json().catch(() => ({}))
      return { ok: false, error: error.error || 'Failed to get registration options' }
    }

    const publicKeyOptions = await optionsResponse.json()

    // Step 2: Convert options for WebAuthn API
    const createOptions: CredentialCreationOptions = {
      publicKey: {
        ...publicKeyOptions,
        challenge: base64UrlToBuffer(publicKeyOptions.challenge),
        user: {
          ...publicKeyOptions.user,
          id: base64UrlToBuffer(publicKeyOptions.user.id),
        },
        excludeCredentials: publicKeyOptions.excludeCredentials?.map(
          (cred: { id: string; type: string; transports?: string[] }) => ({
            ...cred,
            id: base64UrlToBuffer(cred.id),
          })
        ),
      },
    }

    // Step 3: Create credential via WebAuthn API
    const credential = (await navigator.credentials.create(
      createOptions
    )) as PublicKeyCredential | null

    if (!credential) {
      return { ok: false, error: 'Credential creation was cancelled' }
    }

    const response = credential.response as AuthenticatorAttestationResponse

    // Step 4: Send credential to server for verification
    const verifyResponse = await fetch(
      `${config.basePath}/passkey/register/verify`,
      {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credential: {
            id: credential.id,
            rawId: bufferToBase64Url(credential.rawId),
            response: {
              clientDataJSON: bufferToBase64Url(response.clientDataJSON),
              attestationObject: bufferToBase64Url(response.attestationObject),
              transports: response.getTransports?.() ?? [],
            },
            type: credential.type,
          },
          userId: publicKeyOptions.user.id, // Include userId for server
        }),
      }
    )

    if (!verifyResponse.ok) {
      const error = await verifyResponse.json().catch(() => ({}))
      return { ok: false, error: error.error || 'Registration verification failed' }
    }

    const result = await verifyResponse.json()

    if (redirect) {
      window.location.href = callbackUrl
    }

    return {
      ok: true,
      credentialId: result.credentialId,
      userId: publicKeyOptions.user.id,
    }
  } catch (error) {
    if (error instanceof Error) {
      // Handle user cancellation
      if (error.name === 'NotAllowedError') {
        return { ok: false, error: 'Passkey creation was cancelled or not allowed' }
      }
      return { ok: false, error: error.message }
    }
    return { ok: false, error: 'An unexpected error occurred' }
  }
}

/**
 * Authenticate with a passkey.
 *
 * This performs the full WebAuthn authentication flow:
 * 1. Gets authentication options from server
 * 2. Calls navigator.credentials.get() to get assertion
 * 3. Sends assertion to server for verification
 * 4. Creates a session on success
 *
 * @param options - Authentication options
 * @returns Authentication result
 *
 * @example
 * ```typescript
 * // With email (shows user's registered passkeys)
 * const result = await authenticateWithPasskey({
 *   email: 'user@example.com',
 * })
 *
 * // Without email (usernameless/discoverable credentials)
 * const result = await authenticateWithPasskey({})
 *
 * if (result.ok) {
 *   console.log('Authenticated!')
 * } else {
 *   console.error('Authentication failed:', result.error)
 * }
 * ```
 */
export async function authenticateWithPasskey(
  options: PasskeyAuthenticateOptions = {}
): Promise<PasskeyAuthenticateResult> {
  const { email, providerId: _providerId = 'passkey', callbackUrl = '/', redirect = true } = options

  try {
    // Step 1: Get authentication options from server
    const optionsResponse = await fetch(
      `${config.basePath}/passkey/authenticate/options`,
      {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      }
    )

    if (!optionsResponse.ok) {
      const error = await optionsResponse.json().catch(() => ({}))
      return { ok: false, error: error.error || 'Failed to get authentication options' }
    }

    const publicKeyOptions = await optionsResponse.json()

    // Step 2: Convert options for WebAuthn API
    const getOptions: CredentialRequestOptions = {
      publicKey: {
        ...publicKeyOptions,
        challenge: base64UrlToBuffer(publicKeyOptions.challenge),
        allowCredentials: publicKeyOptions.allowCredentials?.map(
          (cred: { id: string; type: string; transports?: string[] }) => ({
            ...cred,
            id: base64UrlToBuffer(cred.id),
          })
        ),
      },
    }

    // Step 3: Get credential via WebAuthn API
    const credential = (await navigator.credentials.get(
      getOptions
    )) as PublicKeyCredential | null

    if (!credential) {
      return { ok: false, error: 'Authentication was cancelled' }
    }

    const response = credential.response as AuthenticatorAssertionResponse

    // Step 4: Send credential to server for verification
    const verifyResponse = await fetch(
      `${config.basePath}/passkey/authenticate/verify`,
      {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credential: {
            id: credential.id,
            rawId: bufferToBase64Url(credential.rawId),
            response: {
              clientDataJSON: bufferToBase64Url(response.clientDataJSON),
              authenticatorData: bufferToBase64Url(response.authenticatorData),
              signature: bufferToBase64Url(response.signature),
              userHandle: response.userHandle
                ? bufferToBase64Url(response.userHandle)
                : null,
            },
            type: credential.type,
          },
        }),
      }
    )

    if (!verifyResponse.ok) {
      const error = await verifyResponse.json().catch(() => ({}))
      return { ok: false, error: error.error || 'Authentication verification failed' }
    }

    const result = await verifyResponse.json()

    if (redirect) {
      window.location.href = callbackUrl
    }

    return {
      ok: true,
      userId: result.userId,
    }
  } catch (error) {
    if (error instanceof Error) {
      // Handle user cancellation
      if (error.name === 'NotAllowedError') {
        return { ok: false, error: 'Authentication was cancelled or not allowed' }
      }
      return { ok: false, error: error.message }
    }
    return { ok: false, error: 'An unexpected error occurred' }
  }
}

// ============================================================================
// Base64URL Utilities (for WebAuthn)
// ============================================================================

/**
 * Convert a base64url string to an ArrayBuffer.
 */
function base64UrlToBuffer(base64url: string): ArrayBuffer {
  // Add padding if needed
  const padding = '='.repeat((4 - (base64url.length % 4)) % 4)
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/') + padding

  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

/**
 * Convert an ArrayBuffer to a base64url string.
 */
function bufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  const base64 = btoa(binary)
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
