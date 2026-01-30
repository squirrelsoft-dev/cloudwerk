/**
 * @cloudwerk/auth - defineAuthCallbacks()
 *
 * Auth callbacks definition for convention-based setup.
 */

import type { AuthCallbacksDefinition } from './types.js'

/**
 * Define authentication callbacks.
 *
 * Used in `app/auth/callbacks.ts` to customize authentication behavior.
 * Callbacks are invoked at key points in the auth lifecycle.
 *
 * @param callbacks - Callback functions
 * @returns The callbacks object
 *
 * @example
 * ```typescript
 * // app/auth/callbacks.ts
 * import { defineAuthCallbacks } from '@cloudwerk/auth/convention'
 *
 * export default defineAuthCallbacks({
 *   async signIn({ user, account }) {
 *     // Block unverified emails
 *     if (!user.emailVerified) {
 *       return '/auth/verify-email'
 *     }
 *
 *     // Log sign-in for analytics
 *     console.log(`User ${user.email} signed in via ${account?.provider}`)
 *
 *     return true
 *   },
 *
 *   async session({ session, user }) {
 *     // Add role to session for client access
 *     return {
 *       ...session,
 *       data: {
 *         ...session.data,
 *         role: user.data?.role,
 *       },
 *     }
 *   },
 * })
 * ```
 *
 * @example
 * ```typescript
 * // With JWT customization
 * import { defineAuthCallbacks } from '@cloudwerk/auth/convention'
 *
 * export default defineAuthCallbacks({
 *   async jwt({ token, user, account, trigger }) {
 *     // On initial sign-in, add user data to token
 *     if (trigger === 'signIn' && user) {
 *       token.userId = user.id
 *       token.role = user.data?.role
 *     }
 *
 *     // On account link, add provider info
 *     if (trigger === 'signUp' && account) {
 *       token.provider = account.provider
 *     }
 *
 *     return token
 *   },
 *
 *   async redirect({ url, baseUrl }) {
 *     // Allow relative redirects
 *     if (url.startsWith('/')) {
 *       return `${baseUrl}${url}`
 *     }
 *
 *     // Allow same-origin redirects
 *     if (new URL(url).origin === baseUrl) {
 *       return url
 *     }
 *
 *     // Default to home page
 *     return baseUrl
 *   },
 * })
 * ```
 *
 * @example
 * ```typescript
 * // With sign-out handling
 * import { defineAuthCallbacks } from '@cloudwerk/auth/convention'
 *
 * export default defineAuthCallbacks({
 *   async signOut({ session }) {
 *     // Clean up user-specific resources
 *     await invalidateUserCache(session.userId)
 *
 *     // Log for audit
 *     console.log(`User ${session.userId} signed out`)
 *   },
 * })
 * ```
 */
export function defineAuthCallbacks(
  callbacks: AuthCallbacksDefinition
): AuthCallbacksDefinition {
  return callbacks
}

/**
 * Type guard to check if a value is an AuthCallbacksDefinition.
 */
export function isAuthCallbacksDefinition(
  value: unknown
): value is AuthCallbacksDefinition {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const validKeys = ['signIn', 'session', 'jwt', 'redirect', 'signOut']
  const keys = Object.keys(value)

  return keys.every((key) => validKeys.includes(key))
}

/**
 * Get the list of callback handler names from a definition.
 */
export function getCallbackHandlers(
  callbacks: AuthCallbacksDefinition
): string[] {
  const handlers: string[] = []

  if (callbacks.signIn) handlers.push('signIn')
  if (callbacks.session) handlers.push('session')
  if (callbacks.jwt) handlers.push('jwt')
  if (callbacks.redirect) handlers.push('redirect')
  if (callbacks.signOut) handlers.push('signOut')

  return handlers
}
