/**
 * @cloudwerk/auth - Callback Route Handlers
 *
 * GET /auth/callback/:provider - Handle OAuth callback
 * POST /auth/callback/:provider - Handle credentials callback
 */

import type { OAuthProvider, CredentialsProvider, User, TokenSet } from '../../types.js'
import type {
  AuthRouteContext,
  OAuthCallbackParams,
  StoredOAuthState,
  SignInResult,
} from '../types.js'
import type { StateStorage } from './signin.js'
import { verifyCSRFToken, extractCSRFToken } from './csrf.js'
import { exchangeCodeForTokens } from '../../providers/oauth/tokens.js'

/**
 * Handle GET /auth/callback/:provider request (OAuth callback).
 *
 * @param ctx - Auth route context
 * @param providerId - Provider ID from URL path
 * @param stateStorage - Storage for OAuth state
 * @returns Response with redirect or error
 */
export async function handleOAuthCallback(
  ctx: AuthRouteContext,
  providerId: string,
  stateStorage: StateStorage
): Promise<Response> {
  const { config, providers, url, sessionManager } = ctx

  // Get provider
  const provider = providers.get(providerId)
  if (!provider) {
    return redirectWithError(ctx, 'InvalidProvider', 'Provider not found')
  }

  if (provider.type !== 'oauth' && provider.type !== 'oidc') {
    return redirectWithError(ctx, 'InvalidProvider', 'Provider does not support OAuth')
  }

  const oauthProvider = provider as OAuthProvider

  // Parse callback parameters
  const params: OAuthCallbackParams = {
    code: url.searchParams.get('code') ?? undefined,
    state: url.searchParams.get('state') ?? undefined,
    error: url.searchParams.get('error') ?? undefined,
    error_description: url.searchParams.get('error_description') ?? undefined,
  }

  // Check for OAuth error
  if (params.error) {
    return redirectWithError(
      ctx,
      'OAuthCallback',
      params.error_description ?? params.error
    )
  }

  // Validate required parameters
  if (!params.code || !params.state) {
    return redirectWithError(ctx, 'OAuthCallback', 'Missing code or state')
  }

  // Verify and consume state
  const storedStateJson = await stateStorage.get(`oauth:state:${params.state}`)
  if (!storedStateJson) {
    return redirectWithError(ctx, 'OAuthCallback', 'Invalid or expired state')
  }

  // Delete state to prevent replay
  await stateStorage.delete(`oauth:state:${params.state}`)

  let storedState: StoredOAuthState
  try {
    storedState = JSON.parse(storedStateJson)
  } catch {
    return redirectWithError(ctx, 'OAuthCallback', 'Invalid state data')
  }

  // Verify state matches and belongs to this provider
  if (storedState.state !== params.state || storedState.providerId !== providerId) {
    return redirectWithError(ctx, 'OAuthCallback', 'State mismatch')
  }

  // Exchange code for tokens
  const basePath = config.basePath ?? '/auth'
  const redirectUri = new URL(`${basePath}/callback/${providerId}`, url.origin).toString()

  let result: SignInResult
  try {
    // Get token endpoint
    const tokenEndpoint = typeof oauthProvider.token === 'string'
      ? oauthProvider.token
      : oauthProvider.token?.url

    if (!tokenEndpoint) {
      throw new Error(`Provider ${providerId} has no token endpoint`)
    }

    // Exchange authorization code for tokens
    const tokens = await exchangeCodeForTokens(
      tokenEndpoint,
      {
        grant_type: 'authorization_code',
        code: params.code,
        redirect_uri: redirectUri,
        client_id: oauthProvider.clientId,
        client_secret: oauthProvider.clientSecret,
        code_verifier: storedState.codeVerifier,
      },
      {
        clientAuth: oauthProvider.clientAuth ?? 'client_secret_post',
        headers: oauthProvider.headers,
      }
    )

    // Get user profile from userinfo endpoint
    const profile = await fetchUserProfile(oauthProvider, tokens)

    // Normalize profile to user
    const userData = oauthProvider.profile
      ? await oauthProvider.profile(profile, tokens)
      : normalizeDefaultProfile(profile)

    // Create user object
    const user: User = {
      id: userData.id ?? crypto.randomUUID(),
      email: userData.email ?? '',
      emailVerified: userData.emailVerified ?? null,
      name: userData.name,
      image: userData.image,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    result = {
      success: true,
      user,
      tokens,
      isNewUser: false,
    }
  } catch (error) {
    console.error('OAuth callback error:', error)
    return redirectWithError(
      ctx,
      'OAuthCallback',
      error instanceof Error ? error.message : 'Token exchange failed'
    )
  }

  // Run signIn callback if configured
  if (config.callbacks?.signIn) {
    try {
      const callbackResult = await config.callbacks.signIn({
        user: result.user!,
        account: {
          id: crypto.randomUUID(),
          userId: result.user!.id,
          type: provider.type,
          provider: providerId,
          providerAccountId: result.user!.id,
          accessToken: result.tokens?.accessToken,
          refreshToken: result.tokens?.refreshToken,
          expiresAt: result.tokens?.expiresIn
            ? Math.floor(Date.now() / 1000) + result.tokens.expiresIn
            : null,
          tokenType: result.tokens?.tokenType,
          scope: result.tokens?.scope,
          idToken: result.tokens?.idToken,
        },
        profile: {},
      })

      if (callbackResult === false) {
        return redirectWithError(ctx, 'AccessDenied', 'Sign-in not allowed')
      }

      if (typeof callbackResult === 'string') {
        return Response.redirect(callbackResult, 302)
      }
    } catch (error) {
      console.error('signIn callback error:', error)
      return redirectWithError(ctx, 'Callback', 'Sign-in callback failed')
    }
  }

  // Create session
  const session = await sessionManager.createSession(result.user!.id)

  // Build redirect response with session cookie
  const headers = new Headers()
  headers.set('Location', storedState.callbackUrl ?? '/')

  // Note: The session cookie should be set by the core auth middleware
  // based on the session token. For now, we return the token in a cookie.
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

  return new Response(null, { status: 302, headers })
}

/**
 * Fetch user profile from OAuth provider.
 */
async function fetchUserProfile(
  provider: OAuthProvider,
  tokens: TokenSet
): Promise<Record<string, unknown>> {
  const userinfoEndpoint = typeof provider.userinfo === 'string'
    ? provider.userinfo
    : provider.userinfo?.url

  if (!userinfoEndpoint) {
    // Try to extract from ID token for OIDC
    if (tokens.idToken) {
      return decodeJwtPayload(tokens.idToken)
    }
    throw new Error(`Provider ${provider.id} has no userinfo endpoint`)
  }

  const response = await fetch(userinfoEndpoint, {
    headers: {
      Authorization: `Bearer ${tokens.accessToken}`,
      Accept: 'application/json',
      ...provider.headers,
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch user profile: ${response.status}`)
  }

  return response.json()
}

/**
 * Decode JWT payload without verification.
 */
function decodeJwtPayload(jwt: string): Record<string, unknown> {
  const parts = jwt.split('.')
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format')
  }

  let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
  const padding = 4 - (base64.length % 4)
  if (padding !== 4) {
    base64 += '='.repeat(padding)
  }

  return JSON.parse(atob(base64))
}

/**
 * Default profile normalization for unknown providers.
 */
function normalizeDefaultProfile(profile: Record<string, unknown>): Partial<User> {
  return {
    id: String(profile.id ?? profile.sub ?? ''),
    email: (profile.email as string) ?? null,
    name: (profile.name as string) ?? null,
    image: (profile.picture ?? profile.avatar_url ?? profile.avatar) as string | null,
  }
}

/**
 * Handle POST /auth/callback/:provider request (credentials callback).
 *
 * @param ctx - Auth route context
 * @param providerId - Provider ID from URL path
 * @returns Response with redirect or error
 */
export async function handleCredentialsCallback(
  ctx: AuthRouteContext,
  providerId: string
): Promise<Response> {
  const { config, providers, request, sessionManager, url } = ctx

  // Get provider
  const provider = providers.get(providerId)
  if (!provider) {
    return redirectWithError(ctx, 'InvalidProvider', 'Provider not found')
  }

  if (provider.type !== 'credentials') {
    return redirectWithError(ctx, 'InvalidProvider', 'Provider does not support credentials')
  }

  const credentialsProvider = provider as CredentialsProvider

  // Verify CSRF token
  if (config.csrf?.enabled !== false) {
    const csrfToken = await extractCSRFToken(request)
    if (!csrfToken || !verifyCSRFToken(request, csrfToken)) {
      return redirectWithError(ctx, 'InvalidCSRF', 'Invalid CSRF token')
    }
  }

  // Parse credentials from form data
  let credentials: Record<string, string> = {}
  let callbackUrl = '/'

  try {
    const contentType = request.headers.get('Content-Type') ?? ''

    if (contentType.includes('application/json')) {
      const body = await request.json()
      credentials = body.credentials ?? body
      callbackUrl = body.callbackUrl ?? '/'
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData()
      for (const [key, value] of formData.entries()) {
        if (key === 'callbackUrl') {
          callbackUrl = value.toString()
        } else if (key !== 'csrfToken') {
          credentials[key] = value.toString()
        }
      }
    }
  } catch {
    return redirectWithError(ctx, 'CredentialsSignin', 'Invalid request body')
  }

  // Authorize credentials
  let user: User | null = null
  try {
    const authorizeResult = await credentialsProvider.authorize(credentials, request)

    if (!authorizeResult) {
      return redirectWithError(ctx, 'CredentialsSignin', 'Invalid credentials')
    }

    user = {
      id: authorizeResult.id,
      email: authorizeResult.email,
      emailVerified: authorizeResult.emailVerified,
      name: authorizeResult.name,
      image: authorizeResult.image,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  } catch (error) {
    console.error('Credentials authorize error:', error)
    return redirectWithError(ctx, 'CredentialsSignin', 'Authorization failed')
  }

  // Run signIn callback if configured
  if (config.callbacks?.signIn) {
    try {
      const callbackResult = await config.callbacks.signIn({
        user,
        account: null,
        credentials,
      })

      if (callbackResult === false) {
        return redirectWithError(ctx, 'AccessDenied', 'Sign-in not allowed')
      }

      if (typeof callbackResult === 'string') {
        return Response.redirect(callbackResult, 302)
      }
    } catch (error) {
      console.error('signIn callback error:', error)
      return redirectWithError(ctx, 'Callback', 'Sign-in callback failed')
    }
  }

  // Create session
  const session = await sessionManager.createSession(user.id)

  // Build redirect response with session cookie
  const headers = new Headers()
  headers.set('Location', callbackUrl)

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

  return new Response(null, { status: 302, headers })
}

/**
 * Helper to redirect with error.
 */
function redirectWithError(
  ctx: AuthRouteContext,
  errorCode: string,
  errorMessage: string
): Response {
  const { config, url } = ctx

  const errorPath = config.pages?.error ?? `${config.basePath ?? '/auth'}/error`
  const errorUrl = new URL(errorPath, url.origin)
  errorUrl.searchParams.set('error', errorCode)
  if (errorMessage) {
    errorUrl.searchParams.set('message', errorMessage)
  }

  return Response.redirect(errorUrl.toString(), 302)
}
