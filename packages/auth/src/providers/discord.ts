/**
 * @cloudwerk/auth - Discord OAuth Provider
 *
 * Discord OAuth 2.0 provider for authentication.
 */

import type { OAuthProvider, User } from '../types.js'
import type {
  DiscordConfig,
  DiscordProfile,
  OAuthProviderMethods,
} from './oauth/types.js'
import { createOAuth2Provider } from './oauth/base.js'

/**
 * Discord API endpoints.
 */
const DISCORD_AUTHORIZATION_URL = 'https://discord.com/api/oauth2/authorize'
const DISCORD_TOKEN_URL = 'https://discord.com/api/oauth2/token'
const DISCORD_USER_URL = 'https://discord.com/api/users/@me'

/**
 * Discord CDN base URL.
 */
const DISCORD_CDN_URL = 'https://cdn.discordapp.com'

/**
 * Default OAuth scopes for Discord.
 */
const DEFAULT_SCOPE = 'identify email'

/**
 * Create a Discord OAuth provider.
 *
 * @param config - Discord OAuth configuration
 * @returns Discord OAuth provider
 *
 * @example
 * ```typescript
 * import { discord } from '@cloudwerk/auth/providers'
 *
 * const providers = [
 *   discord({
 *     clientId: env.DISCORD_CLIENT_ID,
 *     clientSecret: env.DISCORD_CLIENT_SECRET,
 *   }),
 * ]
 * ```
 *
 * @example
 * ```typescript
 * // With guild member info
 * discord({
 *   clientId: env.DISCORD_CLIENT_ID,
 *   clientSecret: env.DISCORD_CLIENT_SECRET,
 *   scope: 'identify email guilds guilds.members.read',
 * })
 * ```
 */
export function discord(
  config: DiscordConfig
): OAuthProvider<DiscordProfile> & OAuthProviderMethods<DiscordProfile> {
  const scope = config.scope ?? DEFAULT_SCOPE

  const baseProvider = createOAuth2Provider<DiscordProfile>({
    id: 'discord',
    name: 'Discord',
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    authorization: DISCORD_AUTHORIZATION_URL,
    token: DISCORD_TOKEN_URL,
    userinfo: DISCORD_USER_URL,
    scope,
    checks: ['state'],
    clientAuth: 'client_secret_post',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  })

  return {
    ...baseProvider,

    async normalizeProfile(profile: DiscordProfile): Promise<Partial<User>> {
      // Construct avatar URL
      let image: string | null = null

      if (profile.avatar) {
        const format = profile.avatar.startsWith('a_') ? 'gif' : 'png'
        image = `${DISCORD_CDN_URL}/avatars/${profile.id}/${profile.avatar}.${format}`
      } else {
        // Default avatar based on discriminator or user ID
        const defaultAvatarIndex = profile.discriminator === '0'
          ? Number(BigInt(profile.id) >> BigInt(22)) % 6
          : parseInt(profile.discriminator) % 5
        image = `${DISCORD_CDN_URL}/embed/avatars/${defaultAvatarIndex}.png`
      }

      // Use global_name (display name) if available, fall back to username
      const name = profile.global_name ?? profile.username

      return {
        id: profile.id,
        email: profile.email ?? '',
        emailVerified: profile.verified && profile.email ? new Date() : null,
        name,
        image,
      }
    },
  }
}

/**
 * Get Discord avatar URL for a user.
 *
 * @param userId - Discord user ID
 * @param avatarHash - Avatar hash from profile
 * @param options - Avatar options
 * @returns Avatar URL
 *
 * @example
 * ```typescript
 * const avatarUrl = getDiscordAvatarUrl(
 *   profile.id,
 *   profile.avatar,
 *   { size: 128 }
 * )
 * ```
 */
export function getDiscordAvatarUrl(
  userId: string,
  avatarHash: string | null,
  options?: {
    /**
     * Avatar size (power of 2 between 16 and 4096).
     * @default 128
     */
    size?: number
    /**
     * Format override.
     * @default auto-detected (gif for animated, png otherwise)
     */
    format?: 'png' | 'jpg' | 'jpeg' | 'webp' | 'gif'
  }
): string {
  const size = options?.size ?? 128

  if (!avatarHash) {
    // Default avatar - use a default index
    return `${DISCORD_CDN_URL}/embed/avatars/0.png`
  }

  const format = options?.format ?? (avatarHash.startsWith('a_') ? 'gif' : 'png')
  return `${DISCORD_CDN_URL}/avatars/${userId}/${avatarHash}.${format}?size=${size}`
}

/**
 * Get Discord banner URL for a user.
 *
 * @param userId - Discord user ID
 * @param bannerHash - Banner hash from profile
 * @param options - Banner options
 * @returns Banner URL or null if no banner
 */
export function getDiscordBannerUrl(
  userId: string,
  bannerHash: string | null,
  options?: {
    size?: number
    format?: 'png' | 'jpg' | 'jpeg' | 'webp' | 'gif'
  }
): string | null {
  if (!bannerHash) {
    return null
  }

  const size = options?.size ?? 600
  const format = options?.format ?? (bannerHash.startsWith('a_') ? 'gif' : 'png')
  return `${DISCORD_CDN_URL}/banners/${userId}/${bannerHash}.${format}?size=${size}`
}

// Re-export types for convenience
export type { DiscordConfig, DiscordProfile }
