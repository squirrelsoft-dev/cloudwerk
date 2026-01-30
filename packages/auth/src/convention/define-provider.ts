/**
 * @cloudwerk/auth - defineProvider()
 *
 * Self-registering provider definition for convention-based configuration.
 */

import type { Provider } from '../types.js'
import type { ProviderDefinition } from './types.js'

/**
 * Define an authentication provider.
 *
 * Used in `app/auth/providers/*.ts` files to define providers that are
 * automatically discovered by the auth scanner.
 *
 * @param provider - The provider instance from a provider factory
 * @returns The provider wrapped with metadata
 *
 * @example
 * ```typescript
 * // app/auth/providers/github.ts
 * import { defineProvider, github } from '@cloudwerk/auth/convention'
 *
 * export default defineProvider(
 *   github({
 *     clientId: process.env.GITHUB_CLIENT_ID!,
 *     clientSecret: process.env.GITHUB_CLIENT_SECRET!,
 *   })
 * )
 * ```
 *
 * @example
 * ```typescript
 * // app/auth/providers/credentials.ts
 * import { defineProvider, credentials } from '@cloudwerk/auth/convention'
 * import { verifyPassword } from '@cloudwerk/auth/password'
 *
 * export default defineProvider(
 *   credentials({
 *     async authorize(creds, ctx) {
 *       const user = await ctx.env.DB
 *         .prepare('SELECT * FROM users WHERE email = ?')
 *         .bind(creds.email)
 *         .first()
 *
 *       if (!user) return null
 *       if (!await verifyPassword(creds.password, user.password_hash)) return null
 *
 *       return {
 *         id: user.id,
 *         email: user.email,
 *         name: user.name,
 *         emailVerified: user.email_verified_at ? new Date(user.email_verified_at) : null,
 *       }
 *     }
 *   })
 * )
 * ```
 */
export function defineProvider<T extends Provider>(
  provider: T
): ProviderDefinition<T> {
  return {
    provider,
    id: provider.id,
    type: provider.type,
  }
}

/**
 * Type guard to check if a value is a ProviderDefinition.
 */
export function isProviderDefinition(
  value: unknown
): value is ProviderDefinition {
  return (
    typeof value === 'object' &&
    value !== null &&
    'provider' in value &&
    'id' in value &&
    'type' in value
  )
}
