/**
 * @cloudwerk/cli - Shared Constants
 *
 * Centralized configuration values and magic numbers.
 */

// ============================================================================
// Server Defaults
// ============================================================================

/**
 * Default port for the development server.
 */
export const DEFAULT_PORT = 3000

/**
 * Default host for the development server.
 */
export const DEFAULT_HOST = 'localhost'

/**
 * Timeout in milliseconds before forcing server shutdown.
 */
export const SHUTDOWN_TIMEOUT_MS = 5000

// ============================================================================
// HTTP Status Codes
// ============================================================================

/**
 * HTTP status codes used throughout the CLI.
 */
export const HTTP_STATUS = {
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const
