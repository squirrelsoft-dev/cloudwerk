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
