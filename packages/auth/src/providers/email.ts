/**
 * @cloudwerk/auth - Email (Magic Link) Provider
 *
 * Passwordless authentication via email verification links.
 */

import type { EmailProvider, User } from '../types.js'
import { generateUrlSafeToken } from '../password/token.js'

// ============================================================================
// Types
// ============================================================================

/**
 * Configuration for the email provider.
 */
export interface EmailConfig {
  /**
   * Unique identifier for this provider.
   * @default 'email'
   */
  id?: string

  /**
   * Display name for this provider.
   * @default 'Email'
   */
  name?: string

  /**
   * Sender email address for verification emails.
   */
  from: string

  /**
   * Maximum age of verification token in seconds.
   * @default 86400 (24 hours)
   */
  maxAge?: number

  /**
   * Generate verification token.
   * @default Random URL-safe token
   */
  generateVerificationToken?: () => string | Promise<string>

  /**
   * Send the verification email.
   * This is where you integrate with your email service.
   *
   * @param params - Email parameters
   * @returns Promise that resolves when email is sent
   */
  sendVerificationRequest: (params: {
    /** User's email address */
    identifier: string

    /** Verification URL to include in email */
    url: string

    /** The email provider configuration */
    provider: EmailProvider

    /** The verification token */
    token: string

    /** When the token expires */
    expires: Date
  }) => Promise<void>
}

/**
 * Token storage interface for email verification.
 */
export interface EmailTokenStorage {
  /**
   * Store a verification token.
   *
   * @param identifier - Email address
   * @param token - Verification token
   * @param expires - Expiration date
   */
  createToken(
    identifier: string,
    token: string,
    expires: Date
  ): Promise<void>

  /**
   * Consume a verification token.
   * Returns the identifier if valid, null if invalid/expired.
   * Token should be deleted after successful consumption.
   *
   * @param token - Verification token
   * @returns Email identifier or null
   */
  consumeToken(token: string): Promise<{ identifier: string; expires: Date } | null>
}

// ============================================================================
// Email Provider
// ============================================================================

/**
 * Default token expiration in seconds (24 hours).
 */
export const DEFAULT_EMAIL_TOKEN_MAX_AGE = 86400

/**
 * Create an email (magic link) authentication provider.
 *
 * @param config - Email provider configuration
 * @returns Email provider
 *
 * @example
 * ```typescript
 * import { email } from '@cloudwerk/auth/providers'
 * import { Resend } from 'resend'
 *
 * const resend = new Resend(env.RESEND_API_KEY)
 *
 * const providers = [
 *   email({
 *     from: 'auth@myapp.com',
 *     async sendVerificationRequest({ identifier, url }) {
 *       await resend.emails.send({
 *         from: 'MyApp <auth@myapp.com>',
 *         to: identifier,
 *         subject: 'Sign in to MyApp',
 *         html: `<a href="${url}">Click here to sign in</a>`,
 *       })
 *     },
 *   }),
 * ]
 * ```
 *
 * @example
 * ```typescript
 * // With custom token generation
 * email({
 *   from: 'auth@myapp.com',
 *   maxAge: 3600, // 1 hour
 *   generateVerificationToken: () => crypto.randomUUID(),
 *   async sendVerificationRequest({ identifier, url, token, expires }) {
 *     // Send email with Mailgun, SendGrid, etc.
 *   },
 * })
 * ```
 */
export function email(config: EmailConfig): EmailProvider {
  const id = config.id ?? 'email'
  const name = config.name ?? 'Email'
  const maxAge = config.maxAge ?? DEFAULT_EMAIL_TOKEN_MAX_AGE

  return {
    id,
    name,
    type: 'email',
    from: config.from,
    maxAge,
    sendVerificationRequest: config.sendVerificationRequest,
    generateVerificationToken: config.generateVerificationToken ?? generateDefaultToken,
  }
}

/**
 * Generate default verification token.
 */
function generateDefaultToken(): string {
  return generateUrlSafeToken(32)
}

// ============================================================================
// Email Sign-in Handler
// ============================================================================

/**
 * Options for handling email sign-in request.
 */
export interface HandleEmailSignInOptions {
  /** Email provider */
  provider: EmailProvider

  /** Token storage for verification tokens */
  tokenStorage: EmailTokenStorage

  /** Base URL for verification link */
  baseUrl: string

  /** Callback path for verification */
  callbackPath?: string
}

/**
 * Handle email sign-in request.
 *
 * Generates a verification token and sends the magic link email.
 *
 * @param email - User's email address
 * @param options - Handler options
 * @returns Promise that resolves when email is sent
 *
 * @example
 * ```typescript
 * // In your sign-in route handler
 * export async function POST(request: Request) {
 *   const { email } = await request.json()
 *
 *   await handleEmailSignIn(email, {
 *     provider: emailProvider,
 *     tokenStorage: createKVTokenStorage(env.AUTH_KV),
 *     baseUrl: new URL(request.url).origin,
 *   })
 *
 *   return json({ message: 'Check your email for a sign-in link' })
 * }
 * ```
 */
export async function handleEmailSignIn(
  email: string,
  options: HandleEmailSignInOptions
): Promise<void> {
  const { provider, tokenStorage, baseUrl, callbackPath = '/auth/callback/email' } = options

  // Generate token
  const token = provider.generateVerificationToken
    ? await provider.generateVerificationToken()
    : generateDefaultToken()

  // Calculate expiration
  const maxAge = provider.maxAge ?? DEFAULT_EMAIL_TOKEN_MAX_AGE
  const expires = new Date(Date.now() + maxAge * 1000)

  // Store token
  await tokenStorage.createToken(email, token, expires)

  // Build verification URL
  const url = new URL(callbackPath, baseUrl)
  url.searchParams.set('token', token)
  url.searchParams.set('email', email)

  // Send email
  await provider.sendVerificationRequest({
    identifier: email,
    url: url.toString(),
    provider,
    token,
    expires,
  })
}

/**
 * Handle email callback (verify token and sign in).
 *
 * @param token - Verification token from URL
 * @param tokenStorage - Token storage
 * @returns User data if token is valid, null otherwise
 */
export async function handleEmailCallback(
  token: string,
  tokenStorage: EmailTokenStorage
): Promise<{ email: string; user: Partial<User> } | null> {
  // Consume token
  const result = await tokenStorage.consumeToken(token)

  if (!result) {
    return null
  }

  // Check expiration
  if (result.expires < new Date()) {
    return null
  }

  return {
    email: result.identifier,
    user: {
      email: result.identifier,
      emailVerified: new Date(),
    },
  }
}

// ============================================================================
// KV Token Storage
// ============================================================================

/**
 * KV namespace interface for token storage.
 */
export interface KVNamespaceLike {
  get(key: string): Promise<string | null>
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>
  delete(key: string): Promise<void>
}

/**
 * Create a KV-based token storage.
 *
 * @param kv - KV namespace binding
 * @param prefix - Key prefix
 * @returns Token storage implementation
 *
 * @example
 * ```typescript
 * const tokenStorage = createKVTokenStorage(env.AUTH_KV)
 *
 * await handleEmailSignIn(email, {
 *   provider: emailProvider,
 *   tokenStorage,
 *   baseUrl: origin,
 * })
 * ```
 */
export function createKVTokenStorage(
  kv: KVNamespaceLike,
  prefix: string = 'auth:email-token:'
): EmailTokenStorage {
  return {
    async createToken(identifier, token, expires) {
      const ttl = Math.floor((expires.getTime() - Date.now()) / 1000)
      const value = JSON.stringify({ identifier, expires: expires.toISOString() })

      await kv.put(`${prefix}${token}`, value, {
        expirationTtl: Math.max(ttl, 1),
      })
    },

    async consumeToken(token) {
      const key = `${prefix}${token}`
      const value = await kv.get(key)

      if (!value) {
        return null
      }

      // Delete token (single-use)
      await kv.delete(key)

      try {
        const data = JSON.parse(value)
        return {
          identifier: data.identifier,
          expires: new Date(data.expires),
        }
      } catch {
        return null
      }
    },
  }
}

