/**
 * @cloudwerk/cli - Logger Utility
 *
 * Console output utilities with color support.
 */

import pc from 'picocolors'
import type { Logger } from '../types.js'

// ============================================================================
// Logger Implementation
// ============================================================================

/**
 * Create a logger instance with optional verbose mode.
 *
 * @param verbose - Enable debug output
 * @returns Logger instance
 */
export function createLogger(verbose: boolean = false): Logger {
  return {
    info(message: string): void {
      console.log(pc.blue('info') + ' ' + message)
    },

    success(message: string): void {
      console.log(pc.green('success') + ' ' + message)
    },

    warn(message: string): void {
      console.log(pc.yellow('warn') + ' ' + message)
    },

    error(message: string): void {
      console.log(pc.red('error') + ' ' + message)
    },

    debug(message: string): void {
      if (verbose) {
        console.log(pc.gray('debug') + ' ' + message)
      }
    },

    log(message: string): void {
      console.log(message)
    },
  }
}

// ============================================================================
// Startup Banner
// ============================================================================

/**
 * Print the startup banner with server info.
 *
 * @param version - CLI version
 * @param localUrl - Local server URL
 * @param networkUrl - Network URL (optional)
 * @param routes - Registered routes
 * @param startupTime - Time to start in milliseconds
 */
export function printStartupBanner(
  version: string,
  localUrl: string,
  networkUrl: string | undefined,
  routes: Array<{ method: string; pattern: string }>,
  startupTime: number
): void {
  console.log()
  console.log(pc.bold(pc.cyan('  Cloudwerk')) + pc.dim(` v${version}`))
  console.log()
  console.log(pc.dim('  > ') + pc.bold('Local:') + '    ' + pc.cyan(localUrl))

  if (networkUrl) {
    console.log(pc.dim('  > ') + pc.bold('Network:') + '  ' + pc.cyan(networkUrl))
  }

  console.log()

  if (routes.length > 0) {
    console.log(pc.dim('  Routes:'))

    // Show up to 10 routes, then summarize
    const displayRoutes = routes.slice(0, 10)
    const remainingCount = routes.length - displayRoutes.length

    for (const route of displayRoutes) {
      const methodColor = getMethodColor(route.method)
      console.log(
        pc.dim('    ') +
        methodColor(route.method.padEnd(6)) +
        ' ' +
        route.pattern
      )
    }

    if (remainingCount > 0) {
      console.log(pc.dim(`    ... and ${remainingCount} more routes`))
    }

    console.log()
  }

  console.log(pc.dim(`  Ready in ${startupTime}ms`))
  console.log()
}

/**
 * Get the color function for an HTTP method.
 */
function getMethodColor(method: string): (text: string) => string {
  switch (method.toUpperCase()) {
    case 'GET':
      return pc.green
    case 'POST':
      return pc.blue
    case 'PUT':
      return pc.yellow
    case 'PATCH':
      return pc.magenta
    case 'DELETE':
      return pc.red
    case 'OPTIONS':
      return pc.cyan
    case 'HEAD':
      return pc.gray
    default:
      return pc.white
  }
}

// ============================================================================
// Error Formatting
// ============================================================================

/**
 * Print a formatted error message with suggestion.
 *
 * @param message - Error message
 * @param suggestion - Optional suggestion for fixing
 */
export function printError(message: string, suggestion?: string): void {
  console.log()
  console.log(pc.red('Error: ') + message)

  if (suggestion) {
    console.log()
    console.log(pc.dim('  ' + suggestion))
  }

  console.log()
}

/**
 * Print a validation error with file context.
 *
 * @param filePath - File path with error
 * @param message - Error message
 * @param line - Optional line number
 * @param column - Optional column number
 */
export function printCompilationError(
  filePath: string,
  message: string,
  line?: number,
  column?: number
): void {
  console.log()
  console.log(pc.red('Error in ') + pc.cyan(filePath))
  console.log()
  console.log('  ' + message)

  if (line !== undefined) {
    console.log()
    console.log(pc.dim(`  at line ${line}${column !== undefined ? `, column ${column}` : ''}`))
  }

  console.log()
}

// ============================================================================
// Request Logging
// ============================================================================

/**
 * Log an HTTP request in verbose mode.
 *
 * @param method - HTTP method
 * @param path - Request path
 * @param status - Response status
 * @param duration - Request duration in milliseconds
 */
export function logRequest(
  method: string,
  path: string,
  status: number,
  duration: number
): void {
  const methodColor = getMethodColor(method)
  const statusColor = status >= 400 ? pc.red : status >= 300 ? pc.yellow : pc.green

  console.log(
    pc.dim('[') +
    methodColor(method.padEnd(6)) +
    pc.dim(']') +
    ' ' +
    path +
    ' ' +
    statusColor(String(status)) +
    ' ' +
    pc.dim(`${duration}ms`)
  )
}
