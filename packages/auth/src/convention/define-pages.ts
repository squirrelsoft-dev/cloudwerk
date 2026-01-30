/**
 * @cloudwerk/auth - defineAuthPages()
 *
 * Auth pages definition for convention-based setup.
 */

import type { AuthPagesDefinition } from './types.js'

/**
 * Define custom authentication page paths.
 *
 * Used in `app/auth/pages.ts` to customize auth UI paths.
 * These paths are used for redirects during the auth flow.
 *
 * @param pages - Page path overrides
 * @returns The pages configuration
 *
 * @example
 * ```typescript
 * // app/auth/pages.ts
 * import { defineAuthPages } from '@cloudwerk/auth/convention'
 *
 * export default defineAuthPages({
 *   signIn: '/login',
 *   signOut: '/logout',
 *   error: '/auth/error',
 *   verifyRequest: '/check-email',
 *   newUser: '/welcome',
 * })
 * ```
 *
 * @example
 * ```typescript
 * // Partial override - only customize sign-in
 * import { defineAuthPages } from '@cloudwerk/auth/convention'
 *
 * export default defineAuthPages({
 *   signIn: '/signin',
 * })
 * ```
 */
export function defineAuthPages(pages: AuthPagesDefinition): AuthPagesDefinition {
  return pages
}

/**
 * Type guard to check if a value is an AuthPagesDefinition.
 */
export function isAuthPagesDefinition(
  value: unknown
): value is AuthPagesDefinition {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const validKeys = ['signIn', 'signOut', 'error', 'verifyRequest', 'newUser']
  const keys = Object.keys(value)

  // All keys must be valid page keys and all values must be strings
  return keys.every((key) => {
    if (!validKeys.includes(key)) return false
    const val = (value as Record<string, unknown>)[key]
    return typeof val === 'string' || val === undefined
  })
}

/**
 * Default auth pages configuration.
 */
export const DEFAULT_AUTH_PAGES: Required<AuthPagesDefinition> = {
  signIn: '/auth/signin',
  signOut: '/auth/signout',
  error: '/auth/error',
  verifyRequest: '/auth/verify-request',
  newUser: '/auth/new-user',
}

/**
 * Merge user pages with defaults.
 */
export function mergeAuthPages(
  userPages: AuthPagesDefinition | undefined,
  defaults: AuthPagesDefinition = DEFAULT_AUTH_PAGES
): AuthPagesDefinition {
  if (!userPages) {
    return defaults
  }

  return {
    ...defaults,
    ...userPages,
  }
}
