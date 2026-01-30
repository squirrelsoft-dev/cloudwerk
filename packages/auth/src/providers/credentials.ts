/**
 * @cloudwerk/auth - Credentials Provider
 *
 * Factory function and sign-in handler for username/password authentication.
 *
 * @example
 * ```typescript
 * // Define provider
 * import { credentials, verifyPassword } from '@cloudwerk/auth'
 *
 * export const credentialsProvider = credentials({
 *   async authorize(creds, ctx) {
 *     const user = await ctx.env.DB
 *       .prepare('SELECT * FROM users WHERE email = ?')
 *       .bind(creds.email)
 *       .first()
 *
 *     if (!user) return null
 *
 *     const valid = await verifyPassword(creds.password, user.password_hash)
 *     if (!valid) return null
 *
 *     return { id: user.id, email: user.email, name: user.name, emailVerified: null }
 *   }
 * })
 *
 * // Handle sign-in
 * import { handleCredentialsSignIn } from '@cloudwerk/auth'
 *
 * export async function POST(request: Request, { env }) {
 *   const adapter = createKVSessionAdapter({ binding: env.AUTH_SESSIONS })
 *   const sessionManager = createSessionManager({ adapter })
 *
 *   return handleCredentialsSignIn(request, {
 *     provider: credentialsProvider,
 *     sessionManager,
 *   }, {
 *     redirectTo: '/dashboard',
 *   })
 * }
 * ```
 */

import { getContext } from '@cloudwerk/core'
import type { CredentialInput, CredentialsProvider, Account, User } from '../types.js'
import { setSessionCookie } from '../session/cookie-utils.js'
import type {
  CredentialsConfig,
  CredentialsAuthorizeContext,
  HandleCredentialsSignInOptions,
  CredentialsSignInHandlerConfig,
} from './types.js'

// ============================================================================
// Default Credential Fields
// ============================================================================

/**
 * Default credential fields for email/password login.
 */
const DEFAULT_CREDENTIALS = {
  email: {
    label: 'Email',
    type: 'email',
    placeholder: 'user@example.com',
    required: true,
  },
  password: {
    label: 'Password',
    type: 'password',
    required: true,
  },
} as const

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract credentials from request body.
 *
 * Supports both FormData and JSON request bodies.
 *
 * @param request - The sign-in request
 * @param schema - Credential field schema
 * @returns Extracted credentials
 */
async function extractCredentials(
  request: Request,
  schema: Record<string, CredentialInput>
): Promise<Record<string, string>> {
  const contentType = request.headers.get('content-type') ?? ''
  const credentials: Record<string, string> = {}

  if (contentType.includes('application/json')) {
    const body = await request.json() as Record<string, unknown>
    for (const key of Object.keys(schema)) {
      const value = body[key]
      if (typeof value === 'string') {
        credentials[key] = value
      }
    }
  } else {
    // Treat as FormData (handles application/x-www-form-urlencoded and multipart/form-data)
    const formData = await request.formData()
    for (const key of Object.keys(schema)) {
      const value = formData.get(key)
      if (typeof value === 'string') {
        credentials[key] = value
      }
    }
  }

  return credentials
}

/**
 * Validate that all required fields are present.
 *
 * @param credentials - Submitted credentials
 * @param schema - Credential field schema
 * @throws Error if required fields are missing
 */
function validateRequiredFields(
  credentials: Record<string, string>,
  schema: Record<string, CredentialInput>
): void {
  const missingFields: string[] = []

  for (const [key, config] of Object.entries(schema)) {
    if (config.required !== false && !credentials[key]) {
      missingFields.push(key)
    }
  }

  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`)
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a credentials provider for username/password authentication.
 *
 * The returned provider can be used with `handleCredentialsSignIn()` or
 * added to an auth config's providers array.
 *
 * @typeParam TCredentials - Shape of credential fields
 * @typeParam Env - Environment bindings type
 * @param config - Provider configuration
 * @returns A CredentialsProvider instance
 *
 * @example
 * ```typescript
 * // Basic usage with default email/password fields
 * const provider = credentials({
 *   async authorize(creds, ctx) {
 *     const user = await findUserByEmail(ctx.env.DB, creds.email)
 *     if (!user || !await verifyPassword(creds.password, user.hash)) {
 *       return null
 *     }
 *     return { id: user.id, email: user.email, emailVerified: null }
 *   }
 * })
 *
 * // Custom credentials
 * const provider = credentials({
 *   id: 'custom-login',
 *   name: 'Custom Login',
 *   credentials: {
 *     username: { label: 'Username', type: 'text', required: true },
 *     password: { label: 'Password', type: 'password', required: true },
 *     otp: { label: 'OTP Code', type: 'text' },
 *   },
 *   async authorize(creds, ctx) {
 *     // creds is typed as { username: string, password: string, otp: string }
 *     // ...
 *   }
 * })
 * ```
 */
export function credentials<
  TCredentials extends Record<string, CredentialInput> = typeof DEFAULT_CREDENTIALS,
  Env = Record<string, unknown>,
>(config: CredentialsConfig<TCredentials, Env>): CredentialsProvider {
  const {
    id = 'credentials',
    name = 'Credentials',
    credentials: credentialSchema = DEFAULT_CREDENTIALS as unknown as TCredentials,
    authorize,
  } = config

  return {
    id,
    name,
    type: 'credentials',
    credentials: credentialSchema,
    authorize: async (
      submittedCredentials: Record<string, string>,
      request: Request
    ) => {
      // Get env from context for the authorize callback
      const ctx = getContext()
      const context: CredentialsAuthorizeContext<Env> = {
        request,
        env: ctx.env as Env,
      }

      // Cast credentials to the expected typed shape
      const typedCredentials = submittedCredentials as {
        [K in keyof TCredentials]: string
      }

      return authorize(typedCredentials, context)
    },
  }
}

// ============================================================================
// Response Helpers
// ============================================================================

/**
 * Create a redirect response that works with relative paths.
 *
 * Response.redirect() requires an absolute URL, so we construct
 * the redirect response manually with proper headers.
 */
function createRedirectResponse(location: string): Response {
  return new Response(null, {
    status: 302,
    headers: {
      Location: location,
    },
  })
}

/**
 * Create an error response (redirect or JSON).
 */
function createErrorResponse(
  errorCode: string,
  redirectTo?: string,
  message?: string
): Response {
  if (redirectTo) {
    const separator = redirectTo.includes('?') ? '&' : '?'
    const redirectUrl = `${redirectTo}${separator}error=${encodeURIComponent(errorCode)}`
    return createRedirectResponse(redirectUrl)
  }

  return Response.json(
    { error: errorCode, message: message ?? 'Invalid credentials' },
    { status: 401 }
  )
}

// ============================================================================
// Sign-In Handler
// ============================================================================

/**
 * Handle a credentials sign-in request.
 *
 * Extracts credentials from the request body (FormData or JSON),
 * validates them with the provider's authorize callback, creates
 * a session, and sets the session cookie.
 *
 * @param request - The sign-in request
 * @param handlerConfig - Provider and session manager configuration
 * @param options - Redirect options
 * @returns Response with session cookie (JSON or redirect)
 *
 * @example
 * ```typescript
 * // JSON response
 * export async function POST(request: Request, { env }) {
 *   const adapter = createKVSessionAdapter({ binding: env.AUTH_SESSIONS })
 *   const sessionManager = createSessionManager({ adapter })
 *
 *   return handleCredentialsSignIn(request, {
 *     provider: credentialsProvider,
 *     sessionManager,
 *   })
 *   // Returns: { success: true, user: {...} } or { error: 'CredentialsSignin' }
 * }
 *
 * // Redirect response
 * export async function POST(request: Request, { env }) {
 *   return handleCredentialsSignIn(request, config, {
 *     redirectTo: '/dashboard',
 *     errorRedirectTo: '/login?error=CredentialsSignin',
 *   })
 * }
 * ```
 */
export async function handleCredentialsSignIn(
  request: Request,
  handlerConfig: CredentialsSignInHandlerConfig,
  options: HandleCredentialsSignInOptions = {}
): Promise<Response> {
  const { provider, sessionManager, maxAge } = handlerConfig
  const { redirectTo, errorRedirectTo } = options

  try {
    // Extract credentials from request
    const credentials = await extractCredentials(request, provider.credentials)

    // Validate required fields
    validateRequiredFields(credentials, provider.credentials)

    // Authorize with provider
    const user = await provider.authorize(credentials, request)

    if (!user) {
      return createErrorResponse('CredentialsSignin', errorRedirectTo)
    }

    // Create session
    const session = await sessionManager.createSession(user.id)

    // Create account record for the response
    const account: Account = {
      id: crypto.randomUUID(),
      userId: user.id,
      type: 'credentials',
      provider: provider.id,
      providerAccountId: user.id,
    }

    // Build success response
    const fullUser: User = {
      ...user,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    if (redirectTo) {
      const response = createRedirectResponse(redirectTo)
      return setSessionCookie(response, session.sessionToken, { maxAge })
    }

    const response = Response.json(
      {
        success: true,
        user: fullUser,
        account,
      },
      { status: 200 }
    )

    return setSessionCookie(response, session.sessionToken, { maxAge })
  } catch (error) {
    // Handle validation errors differently
    if (error instanceof Error && error.message.startsWith('Missing required fields')) {
      return createErrorResponse('MissingFields', errorRedirectTo, error.message)
    }

    // Log unexpected errors for debugging
    console.error('Credentials sign-in error:', error)

    return createErrorResponse('CredentialsSignin', errorRedirectTo)
  }
}
