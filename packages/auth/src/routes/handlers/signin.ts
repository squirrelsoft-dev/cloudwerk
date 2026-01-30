/**
 * @cloudwerk/auth - Sign-in Route Handlers
 *
 * GET /auth/signin - Display sign-in page
 * POST /auth/signin - Handle sign-in form submission
 * GET /auth/signin/:provider - Initiate OAuth flow
 */

import type { OAuthProvider } from '../../types.js'
import type { AuthRouteContext, SignInProps, StoredOAuthState } from '../types.js'
import { generatePKCE } from '../../providers/oauth/pkce.js'
import { generateState, generateNonce } from '../../providers/oauth/state.js'
import { getOIDCAuthorizationUrl } from '../../providers/oauth/base.js'

/**
 * State storage interface for OAuth flows.
 */
export interface StateStorage {
  set(key: string, value: string, ttl: number): Promise<void>
  get(key: string): Promise<string | null>
  delete(key: string): Promise<void>
}

/**
 * Default state TTL in seconds (10 minutes).
 */
const STATE_TTL = 600

/**
 * Handle GET /auth/signin request.
 *
 * Returns sign-in page props or redirects to sign-in page.
 *
 * @param ctx - Auth route context
 * @returns Response with sign-in page or redirect
 */
export async function handleSignIn(
  ctx: AuthRouteContext
): Promise<Response> {
  const { config, providers, url } = ctx

  // Get callback URL from query param or default
  const callbackUrl = url.searchParams.get('callbackUrl') ?? '/'
  const error = url.searchParams.get('error')

  // Build provider list
  const providerList: SignInProps['providers'] = []
  for (const [id, provider] of providers) {
    providerList.push({
      id,
      name: provider.name,
      type: provider.type,
      callbackUrl: `${config.basePath ?? '/auth'}/signin/${id}`,
    })
  }

  // Generate CSRF token for forms
  const csrfToken = generateState()

  const props: SignInProps = {
    providers: providerList,
    csrfToken,
    callbackUrl,
    error: error ?? undefined,
  }

  // If custom sign-in page is configured, redirect to it with props
  if (config.pages?.signIn) {
    const signInUrl = new URL(config.pages.signIn, url.origin)
    signInUrl.searchParams.set('callbackUrl', callbackUrl)
    if (error) signInUrl.searchParams.set('error', error)

    return Response.redirect(signInUrl.toString(), 302)
  }

  // Return JSON for API consumers
  return new Response(JSON.stringify(props), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      ...Object.fromEntries(ctx.responseHeaders),
    },
  })
}

/**
 * Handle GET /auth/signin/:provider request.
 *
 * Initiates OAuth flow by redirecting to provider's authorization URL.
 *
 * @param ctx - Auth route context
 * @param providerId - Provider ID from URL path
 * @param stateStorage - Storage for OAuth state
 * @returns Redirect response to OAuth provider
 */
export async function handleSignInProvider(
  ctx: AuthRouteContext,
  providerId: string,
  stateStorage: StateStorage
): Promise<Response> {
  const { config, providers, url } = ctx

  // Get provider
  const provider = providers.get(providerId)
  if (!provider) {
    return new Response(JSON.stringify({ error: 'Provider not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Only OAuth/OIDC providers can use this endpoint
  if (provider.type !== 'oauth' && provider.type !== 'oidc') {
    return new Response(
      JSON.stringify({ error: 'Provider does not support OAuth flow' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const oauthProvider = provider as OAuthProvider

  // Get callback URL
  const callbackUrl = url.searchParams.get('callbackUrl') ?? '/'

  // Generate state and PKCE
  const state = generateState()
  const pkce = await generatePKCE()
  const nonce = oauthProvider.type === 'oidc' ? generateNonce() : undefined

  // Store state for callback verification
  const storedState: StoredOAuthState = {
    state,
    callbackUrl,
    codeVerifier: pkce.codeVerifier,
    nonce,
    providerId,
    createdAt: Date.now(),
  }

  await stateStorage.set(`oauth:state:${state}`, JSON.stringify(storedState), STATE_TTL)

  // Build redirect URI
  const basePath = config.basePath ?? '/auth'
  const redirectUri = new URL(`${basePath}/callback/${providerId}`, url.origin).toString()

  // Generate authorization URL
  let authorizationUrl: string

  if (oauthProvider.type === 'oidc') {
    // OIDC providers need async URL generation for discovery
    authorizationUrl = await getOIDCAuthorizationUrl(oauthProvider, {
      redirectUri,
      state,
      codeChallenge: pkce.codeChallenge,
      nonce,
    })
  } else {
    // Standard OAuth2 providers - build URL from config
    authorizationUrl = buildAuthorizationUrl(oauthProvider, {
      redirectUri,
      state,
      codeChallenge: pkce.codeChallenge,
    })
  }

  return Response.redirect(authorizationUrl, 302)
}

/**
 * Build authorization URL from OAuth provider config.
 */
function buildAuthorizationUrl(
  provider: OAuthProvider,
  options: {
    redirectUri: string
    state: string
    codeChallenge?: string
  }
): string {
  const authEndpoint = typeof provider.authorization === 'string'
    ? provider.authorization
    : provider.authorization?.url

  if (!authEndpoint) {
    throw new Error(`Provider ${provider.id} has no authorization endpoint`)
  }

  const url = new URL(authEndpoint)
  url.searchParams.set('client_id', provider.clientId)
  url.searchParams.set('redirect_uri', options.redirectUri)
  url.searchParams.set('response_type', 'code')

  if (provider.scope) {
    url.searchParams.set('scope', provider.scope)
  }

  // Add state
  if (provider.checks?.includes('state') ?? true) {
    url.searchParams.set('state', options.state)
  }

  // Add PKCE challenge
  if (provider.checks?.includes('pkce') && options.codeChallenge) {
    url.searchParams.set('code_challenge', options.codeChallenge)
    url.searchParams.set('code_challenge_method', 'S256')
  }

  // Add custom authorization params
  if (provider.authorizationParams) {
    for (const [key, value] of Object.entries(provider.authorizationParams)) {
      url.searchParams.set(key, value)
    }
  }

  // Add params from authorization config object
  const authConfig = typeof provider.authorization === 'object' ? provider.authorization : null
  if (authConfig?.params) {
    for (const [key, value] of Object.entries(authConfig.params)) {
      url.searchParams.set(key, value)
    }
  }

  return url.toString()
}

/**
 * Handle POST /auth/signin request (credentials sign-in).
 *
 * @param ctx - Auth route context
 * @returns Response with sign-in result
 */
export async function handleSignInPost(
  ctx: AuthRouteContext
): Promise<Response> {
  // This handler is for the general sign-in form
  // Individual provider callbacks handle the actual authentication

  const { url, config } = ctx

  // Get callback URL from form or default
  let callbackUrl = '/'

  try {
    const contentType = ctx.request.headers.get('Content-Type') ?? ''

    if (contentType.includes('application/json')) {
      const body = await ctx.request.json()
      callbackUrl = body.callbackUrl ?? '/'
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await ctx.request.formData()
      callbackUrl = formData.get('callbackUrl')?.toString() ?? '/'
    }
  } catch {
    // Ignore parsing errors
  }

  // Redirect to sign-in page with callback URL
  const signInPath = config.pages?.signIn ?? `${config.basePath ?? '/auth'}/signin`
  const signInUrl = new URL(signInPath, url.origin)
  signInUrl.searchParams.set('callbackUrl', callbackUrl)

  return Response.redirect(signInUrl.toString(), 302)
}
