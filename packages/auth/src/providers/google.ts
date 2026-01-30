/**
 * @cloudwerk/auth - Google OAuth Provider
 *
 * Google OAuth 2.0 / OpenID Connect provider for authentication.
 */

import type { OAuthProvider, User } from '../types.js'
import type {
  GoogleConfig,
  GoogleProfile,
  OAuthProviderMethods,
  OIDCDiscoveryDocument,
} from './oauth/types.js'
import { createOIDCProvider, getOIDCAuthorizationUrl } from './oauth/base.js'

/**
 * Google OIDC well-known configuration URL.
 */
const GOOGLE_WELL_KNOWN =
  'https://accounts.google.com/.well-known/openid-configuration'

/**
 * Default OAuth scopes for Google.
 */
const DEFAULT_SCOPE = 'openid email profile'

/**
 * Create a Google OAuth provider.
 *
 * Uses OpenID Connect for authentication, which provides standardized
 * user profile information via ID token claims.
 *
 * @param config - Google OAuth configuration
 * @returns Google OAuth provider
 *
 * @example
 * ```typescript
 * import { google } from '@cloudwerk/auth/providers'
 *
 * const providers = [
 *   google({
 *     clientId: env.GOOGLE_CLIENT_ID,
 *     clientSecret: env.GOOGLE_CLIENT_SECRET,
 *   }),
 * ]
 * ```
 *
 * @example
 * ```typescript
 * // With refresh token support
 * google({
 *   clientId: env.GOOGLE_CLIENT_ID,
 *   clientSecret: env.GOOGLE_CLIENT_SECRET,
 *   authorizationParams: {
 *     access_type: 'offline',
 *     prompt: 'consent',
 *   },
 * })
 * ```
 *
 * @example
 * ```typescript
 * // With additional scopes
 * google({
 *   clientId: env.GOOGLE_CLIENT_ID,
 *   clientSecret: env.GOOGLE_CLIENT_SECRET,
 *   scope: 'openid email profile https://www.googleapis.com/auth/calendar.readonly',
 * })
 * ```
 */
export function google(
  config: GoogleConfig
): OAuthProvider<GoogleProfile> &
  OAuthProviderMethods<GoogleProfile> & {
    discover: () => Promise<OIDCDiscoveryDocument>
    getAuthorizationUrlAsync: (options: {
      redirectUri: string
      state: string
      codeChallenge?: string
      nonce?: string
    }) => Promise<string>
  } {
  const scope = config.scope ?? DEFAULT_SCOPE

  const baseProvider = createOIDCProvider<GoogleProfile>({
    id: 'google',
    name: 'Google',
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    wellKnown: GOOGLE_WELL_KNOWN,
    scope,
    checks: ['state', 'pkce', 'nonce'],
    clientAuth: 'client_secret_post',
    authorizationParams: config.authorizationParams,
  })

  return {
    ...baseProvider,

    /**
     * Get authorization URL (async version for OIDC).
     */
    async getAuthorizationUrlAsync(options: {
      redirectUri: string
      state: string
      codeChallenge?: string
      nonce?: string
    }): Promise<string> {
      return getOIDCAuthorizationUrl(baseProvider, options)
    },

    async normalizeProfile(profile: GoogleProfile): Promise<Partial<User>> {
      return {
        id: profile.sub,
        email: profile.email,
        emailVerified: profile.email_verified ? new Date() : null,
        name: profile.name,
        image: profile.picture,
      }
    },
  }
}

// Re-export types for convenience
export type { GoogleConfig, GoogleProfile }
