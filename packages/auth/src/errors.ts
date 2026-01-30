/**
 * @cloudwerk/auth - Error Classes
 *
 * Specialized error classes for authentication and authorization failures.
 */

import { AuthError } from './types.js'

// ============================================================================
// UnauthenticatedError
// ============================================================================

/**
 * Error thrown when a user is not authenticated but authentication is required.
 *
 * This error is typically thrown by `requireAuth()` when no session exists.
 * It maps to a 401 Unauthorized HTTP response.
 *
 * @example
 * ```typescript
 * import { UnauthenticatedError } from '@cloudwerk/auth'
 *
 * if (!session) {
 *   throw new UnauthenticatedError('Please sign in to continue')
 * }
 * ```
 */
export class UnauthenticatedError extends AuthError {
  readonly name = 'UnauthenticatedError' as const

  /**
   * Create a new UnauthenticatedError.
   *
   * @param message - Optional error message (defaults to 'Authentication required')
   * @param options - Optional error options (cause)
   */
  constructor(message: string = 'Authentication required', options?: { cause?: Error }) {
    super('SessionRequired', message, { status: 401, cause: options?.cause })

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, UnauthenticatedError)
    }
  }
}

// ============================================================================
// ForbiddenError
// ============================================================================

/**
 * Error thrown when a user is authenticated but lacks required permissions.
 *
 * This error is typically thrown by `requireRole()` or `requirePermission()`
 * when the user doesn't have the necessary authorization. It maps to a
 * 403 Forbidden HTTP response.
 *
 * @example
 * ```typescript
 * import { ForbiddenError } from '@cloudwerk/auth'
 *
 * if (!user.roles.includes('admin')) {
 *   throw new ForbiddenError('Admin access required')
 * }
 * ```
 */
export class ForbiddenError extends AuthError {
  readonly name = 'ForbiddenError' as const

  /** The required role that was missing (if applicable) */
  readonly requiredRole?: string

  /** The required permission that was missing (if applicable) */
  readonly requiredPermission?: string

  /**
   * Create a new ForbiddenError.
   *
   * @param message - Optional error message (defaults to 'Access denied')
   * @param options - Optional error options (cause, requiredRole, requiredPermission)
   */
  constructor(
    message: string = 'Access denied',
    options?: { cause?: Error; requiredRole?: string; requiredPermission?: string }
  ) {
    super('AccessDenied', message, { status: 403, cause: options?.cause })
    this.requiredRole = options?.requiredRole
    this.requiredPermission = options?.requiredPermission

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ForbiddenError)
    }
  }
}

// ============================================================================
// InvalidCredentialsError
// ============================================================================

/**
 * Error thrown when user credentials are invalid during sign-in.
 *
 * This error is typically thrown by credentials providers when the
 * email/password combination is incorrect. It maps to a 401 Unauthorized
 * HTTP response.
 *
 * @example
 * ```typescript
 * import { InvalidCredentialsError } from '@cloudwerk/auth'
 *
 * const user = await db.users.findByEmail(email)
 * if (!user || !await verifyPassword(password, user.passwordHash)) {
 *   throw new InvalidCredentialsError()
 * }
 * ```
 */
export class InvalidCredentialsError extends AuthError {
  readonly name = 'InvalidCredentialsError' as const

  /**
   * Create a new InvalidCredentialsError.
   *
   * @param message - Optional error message (defaults to 'Invalid credentials')
   * @param options - Optional error options (cause)
   */
  constructor(message: string = 'Invalid credentials', options?: { cause?: Error }) {
    super('CredentialsSignin', message, { status: 401, cause: options?.cause })

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, InvalidCredentialsError)
    }
  }
}

// ============================================================================
// SessionExpiredError
// ============================================================================

/**
 * Error thrown when a user's session has expired.
 *
 * This error is typically thrown by session middleware when the session
 * exists but has passed its expiration time. It maps to a 401 Unauthorized
 * HTTP response.
 *
 * @example
 * ```typescript
 * import { SessionExpiredError } from '@cloudwerk/auth'
 *
 * if (session.expiresAt < new Date()) {
 *   throw new SessionExpiredError()
 * }
 * ```
 */
export class SessionExpiredError extends AuthError {
  readonly name = 'SessionExpiredError' as const

  /**
   * Create a new SessionExpiredError.
   *
   * @param message - Optional error message (defaults to 'Session expired')
   * @param options - Optional error options (cause)
   */
  constructor(message: string = 'Session expired', options?: { cause?: Error }) {
    super('SessionRequired', message, { status: 401, cause: options?.cause })

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SessionExpiredError)
    }
  }
}
