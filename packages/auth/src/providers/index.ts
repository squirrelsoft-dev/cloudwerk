/**
 * @cloudwerk/auth - Providers Module
 *
 * Authentication providers for @cloudwerk/auth.
 *
 * @example
 * ```typescript
 * import { credentials, handleCredentialsSignIn } from '@cloudwerk/auth/providers'
 *
 * // Create a credentials provider
 * const provider = credentials({
 *   async authorize(creds, ctx) {
 *     const user = await findUser(ctx.env.DB, creds.email)
 *     if (!user || !await verifyPassword(creds.password, user.hash)) {
 *       return null
 *     }
 *     return { id: user.id, email: user.email, emailVerified: null }
 *   }
 * })
 *
 * // Handle sign-in in a route
 * export async function POST(request: Request) {
 *   return handleCredentialsSignIn(request, { provider, sessionManager })
 * }
 * ```
 */

// Credentials provider
export { credentials, handleCredentialsSignIn } from './credentials.js'

// Types
export type {
  CredentialsConfig,
  CredentialsAuthorizeContext,
  AuthorizeResult,
  HandleCredentialsSignInOptions,
  CredentialsSignInHandlerConfig,
  CredentialsSignInResult,
} from './types.js'
