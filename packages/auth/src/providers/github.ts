/**
 * @cloudwerk/auth - GitHub OAuth Provider
 *
 * GitHub OAuth 2.0 provider for authentication.
 */

import type { OAuthProvider, TokenSet, User } from '../types.js'
import type {
  GitHubConfig,
  GitHubProfile,
  GitHubEmail,
  OAuthProviderMethods,
} from './oauth/types.js'
import { createOAuth2Provider } from './oauth/base.js'

/**
 * GitHub API endpoints.
 */
const GITHUB_AUTHORIZATION_URL = 'https://github.com/login/oauth/authorize'
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token'
const GITHUB_USER_URL = 'https://api.github.com/user'
const GITHUB_EMAILS_URL = 'https://api.github.com/user/emails'

/**
 * Default OAuth scopes for GitHub.
 */
const DEFAULT_SCOPE = 'read:user user:email'

/**
 * Create a GitHub OAuth provider.
 *
 * @param config - GitHub OAuth configuration
 * @returns GitHub OAuth provider
 *
 * @example
 * ```typescript
 * import { github } from '@cloudwerk/auth/providers'
 *
 * const providers = [
 *   github({
 *     clientId: env.GITHUB_CLIENT_ID,
 *     clientSecret: env.GITHUB_CLIENT_SECRET,
 *   }),
 * ]
 * ```
 *
 * @example
 * ```typescript
 * // With custom scopes for organization access
 * github({
 *   clientId: env.GITHUB_CLIENT_ID,
 *   clientSecret: env.GITHUB_CLIENT_SECRET,
 *   scope: 'read:user user:email read:org',
 * })
 * ```
 */
export function github(
  config: GitHubConfig
): OAuthProvider<GitHubProfile> & OAuthProviderMethods<GitHubProfile> {
  const scope = config.scope ?? DEFAULT_SCOPE

  const baseProvider = createOAuth2Provider<GitHubProfile>({
    id: 'github',
    name: 'GitHub',
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    authorization: GITHUB_AUTHORIZATION_URL,
    token: GITHUB_TOKEN_URL,
    userinfo: GITHUB_USER_URL,
    scope,
    checks: ['state'],
    clientAuth: 'client_secret_post',
    headers: {
      Accept: 'application/json',
    },
  })

  // Override getUserProfile to handle GitHub's separate emails endpoint
  const originalGetUserProfile = baseProvider.getUserProfile.bind(baseProvider)

  return {
    ...baseProvider,

    async getUserProfile(tokens: TokenSet): Promise<GitHubProfile> {
      // Get basic profile
      const profile = await originalGetUserProfile(tokens)

      // If no email in profile, fetch from emails API
      if (!profile.email && scope.includes('user:email')) {
        try {
          const email = await fetchPrimaryEmail(tokens.accessToken)
          if (email) {
            profile.email = email
          }
        } catch {
          // Email fetch failed, continue without email
        }
      }

      return profile
    },

    async normalizeProfile(
      profile: GitHubProfile,
      tokens: TokenSet
    ): Promise<Partial<User>> {
      // Fetch email and verification status from emails API
      let email = profile.email
      let emailVerified: Date | null = null

      if (scope.includes('user:email')) {
        const emailInfo = await fetchPrimaryEmailWithVerification(tokens.accessToken)
        if (emailInfo) {
          // Use email from API if profile email is null, or verify the profile email
          if (!email) {
            email = emailInfo.email
          }
          // Set verified status if this is the same email or we're using the API email
          if (email === emailInfo.email && emailInfo.verified) {
            emailVerified = new Date()
          }
        }
      }

      return {
        id: String(profile.id),
        email: email ?? null,
        emailVerified,
        name: profile.name ?? profile.login,
        image: profile.avatar_url,
      }
    },
  }
}

/**
 * Fetch emails from GitHub emails API.
 *
 * @param accessToken - GitHub access token
 * @returns Array of GitHub emails or null if request failed
 */
async function fetchGitHubEmails(accessToken: string): Promise<GitHubEmail[] | null> {
  const response = await fetch(GITHUB_EMAILS_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      'User-Agent': 'Cloudwerk-Auth',
    },
  })

  if (!response.ok) {
    return null
  }

  return response.json() as Promise<GitHubEmail[]>
}

/**
 * Fetch user's primary email from GitHub emails API.
 *
 * @param accessToken - GitHub access token
 * @returns Primary email address or null
 */
async function fetchPrimaryEmail(accessToken: string): Promise<string | null> {
  const emails = await fetchGitHubEmails(accessToken)

  if (!emails) {
    return null
  }

  // Find primary verified email
  const primary = emails.find((e) => e.primary && e.verified)
  if (primary) {
    return primary.email
  }

  // Fall back to any verified email
  const verified = emails.find((e) => e.verified)
  if (verified) {
    return verified.email
  }

  // Fall back to any email
  return emails[0]?.email ?? null
}

/**
 * Fetch primary email with verification status.
 *
 * @param accessToken - GitHub access token
 * @returns Email info or null
 */
async function fetchPrimaryEmailWithVerification(
  accessToken: string
): Promise<{ email: string; verified: boolean } | null> {
  const emails = await fetchGitHubEmails(accessToken)

  if (!emails) {
    return null
  }

  // Find primary email (prefer verified)
  const primary = emails.find((e) => e.primary)
  if (primary) {
    return { email: primary.email, verified: primary.verified }
  }

  // Fall back to first verified email
  const verified = emails.find((e) => e.verified)
  if (verified) {
    return { email: verified.email, verified: true }
  }

  // Fall back to any email
  if (emails[0]) {
    return { email: emails[0].email, verified: emails[0].verified }
  }

  return null
}

// Re-export types for convenience
export type { GitHubConfig, GitHubProfile, GitHubEmail }
