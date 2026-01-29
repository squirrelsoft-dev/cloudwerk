/**
 * @cloudwerk/cli - Command Error Handler
 *
 * Centralized error handling for CLI commands.
 */

import pc from 'picocolors'
import { CliError } from '../types.js'
import { printError } from './logger.js'

/**
 * Handle errors from CLI commands consistently.
 *
 * @param error - The error to handle
 * @param verbose - Whether to show stack traces
 */
export function handleCommandError(error: unknown, verbose: boolean = false): never {
  if (error instanceof CliError) {
    printError(error.message, error.suggestion)
    process.exit(1)
  }

  // User cancelled prompt (Ctrl+C or ESC)
  if (
    error instanceof Error &&
    (error.message.includes('User force closed') ||
      error.name === 'ExitPromptError')
  ) {
    console.log()
    console.log(pc.dim('Cancelled.'))
    process.exit(0)
  }

  if (error instanceof Error) {
    printError(error.message)
    if (verbose && error.stack) {
      console.log(error.stack)
    }
    process.exit(1)
  }

  printError(String(error))
  process.exit(1)
}

/**
 * Wrap an async command function with standardized error handling.
 *
 * @param fn - The command function to wrap
 * @param getVerbose - Function to extract verbose flag from options
 * @returns Wrapped function with error handling
 */
export function withErrorHandling<TArgs extends unknown[], TOptions extends { verbose?: boolean }>(
  fn: (...args: [...TArgs, TOptions]) => Promise<void>
): (...args: [...TArgs, TOptions]) => Promise<void> {
  return async (...args: [...TArgs, TOptions]) => {
    const options = args[args.length - 1] as TOptions
    const verbose = options?.verbose ?? false

    try {
      await fn(...args)
    } catch (error) {
      handleCommandError(error, verbose)
    }
  }
}
