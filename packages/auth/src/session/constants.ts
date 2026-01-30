/**
 * Session module constants.
 *
 * Default values for session management, cookie handling, and storage.
 */

// ============================================================================
// Cookie Constants
// ============================================================================

/** Default session cookie name */
export const DEFAULT_SESSION_COOKIE_NAME = 'cloudwerk.session-token'

/** Default cookie attributes with secure defaults */
export const DEFAULT_COOKIE_ATTRIBUTES = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax' as const,
  path: '/',
} as const

// ============================================================================
// Session Timing Constants
// ============================================================================

/** Default session max age: 30 days in seconds */
export const DEFAULT_SESSION_MAX_AGE = 30 * 24 * 60 * 60

/** Default session update age: 24 hours in seconds */
export const DEFAULT_SESSION_UPDATE_AGE = 24 * 60 * 60

/** Grace period for session expiration checks: 5 minutes in seconds */
export const SESSION_EXPIRY_GRACE_PERIOD = 5 * 60

// ============================================================================
// KV Storage Constants
// ============================================================================

/** Default prefix for session keys in KV */
export const DEFAULT_SESSION_PREFIX = 'session:'

/** Prefix for user session index keys */
export const USER_SESSIONS_PREFIX = 'user_sessions:'

// ============================================================================
// JWT Constants
// ============================================================================

/** Default JWT algorithm */
export const DEFAULT_JWT_ALGORITHM = 'HS256' as const

/** JWT claim names (shortened for compact tokens) */
export const JWT_CLAIMS = {
  /** Session ID */
  sessionId: 'sid',
  /** User ID */
  userId: 'uid',
  /** Session token */
  sessionToken: 'stk',
  /** Session data */
  data: 'dat',
  /** Created at timestamp */
  createdAt: 'cat',
  /** Updated at timestamp */
  updatedAt: 'uat',
} as const
