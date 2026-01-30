/**
 * @cloudwerk/auth - defineAuthConfig()
 *
 * Auth configuration definition for convention-based setup.
 */

import type { AuthConfigDefinition } from './types.js'

/**
 * Define authentication configuration.
 *
 * Used in `app/auth/config.ts` to configure global auth settings.
 * These settings apply to all providers and override defaults.
 *
 * @param config - Auth configuration options
 * @returns The configuration object
 *
 * @example
 * ```typescript
 * // app/auth/config.ts
 * import { defineAuthConfig } from '@cloudwerk/auth/convention'
 *
 * export default defineAuthConfig({
 *   basePath: '/auth',
 *   session: {
 *     strategy: 'database',
 *     maxAge: 30 * 24 * 60 * 60, // 30 days
 *   },
 *   csrf: {
 *     enabled: true,
 *   },
 *   debug: process.env.NODE_ENV === 'development',
 * })
 * ```
 *
 * @example
 * ```typescript
 * // With disabled providers
 * import { defineAuthConfig } from '@cloudwerk/auth/convention'
 *
 * export default defineAuthConfig({
 *   // Temporarily disable Discord while fixing integration
 *   disabledProviders: ['discord'],
 * })
 * ```
 *
 * @example
 * ```typescript
 * // Production-ready configuration
 * import { defineAuthConfig } from '@cloudwerk/auth/convention'
 *
 * export default defineAuthConfig({
 *   basePath: '/api/auth',
 *   session: {
 *     strategy: 'database',
 *     maxAge: 7 * 24 * 60 * 60, // 7 days
 *     updateAge: 24 * 60 * 60, // Update session once per day
 *   },
 *   cookies: {
 *     sessionToken: {
 *       name: '__Secure-session',
 *       options: {
 *         secure: true,
 *         httpOnly: true,
 *         sameSite: 'lax',
 *         path: '/',
 *       },
 *     },
 *   },
 *   csrf: {
 *     enabled: true,
 *     methods: ['POST', 'PUT', 'PATCH', 'DELETE'],
 *   },
 *   trustHost: true,
 * })
 * ```
 */
export function defineAuthConfig(
  config: AuthConfigDefinition
): AuthConfigDefinition {
  return config
}

/**
 * Type guard to check if a value is an AuthConfigDefinition.
 */
export function isAuthConfigDefinition(
  value: unknown
): value is AuthConfigDefinition {
  return typeof value === 'object' && value !== null
}

/**
 * Default auth configuration.
 */
export const DEFAULT_AUTH_CONFIG: Required<
  Pick<AuthConfigDefinition, 'basePath' | 'trustHost' | 'debug'>
> & AuthConfigDefinition = {
  basePath: '/auth',
  trustHost: true,
  debug: false,
}

/**
 * Merge user config with defaults.
 */
export function mergeAuthConfig(
  userConfig: AuthConfigDefinition | undefined,
  defaults: AuthConfigDefinition = DEFAULT_AUTH_CONFIG
): AuthConfigDefinition {
  if (!userConfig) {
    return defaults
  }

  return {
    ...defaults,
    ...userConfig,
    session: userConfig.session
      ? { ...defaults.session, ...userConfig.session }
      : defaults.session,
    cookies: userConfig.cookies
      ? { ...defaults.cookies, ...userConfig.cookies }
      : defaults.cookies,
    csrf: userConfig.csrf
      ? { ...defaults.csrf, ...userConfig.csrf }
      : defaults.csrf,
  }
}
