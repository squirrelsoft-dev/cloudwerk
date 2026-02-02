/**
 * @cloudwerk/cli - Auth Command
 *
 * Main entry point for the auth command group.
 * Displays an overview of auth configuration when called without a subcommand.
 */

import pc from 'picocolors'
import { loadConfig } from '@cloudwerk/core/build'
import { createLogger } from '../utils/logger.js'
import { handleCommandError } from '../utils/command-error-handler.js'
import { scanAuthProviders, loadAuthConfig } from '../utils/auth-scanner.js'

// ============================================================================
// Types
// ============================================================================

export interface AuthCommandOptions {
  /** Enable verbose output */
  verbose?: boolean
}

// ============================================================================
// Auth Command
// ============================================================================

/**
 * Display auth overview and available subcommands.
 */
export async function auth(options: AuthCommandOptions = {}): Promise<void> {
  const verbose = options.verbose ?? false
  const logger = createLogger(verbose)

  try {
    const cwd = process.cwd()

    // Load config
    logger.debug('Loading configuration...')
    const config = await loadConfig(cwd)
    const appDir = config.appDir

    // Scan for auth providers
    logger.debug(`Scanning for auth providers in ${appDir}/auth/providers/...`)
    const providers = await scanAuthProviders(appDir)

    // Load auth config
    logger.debug(`Loading auth config from ${appDir}/auth/config.ts...`)
    const authConfig = await loadAuthConfig(appDir)

    console.log()
    console.log(pc.bold('Cloudwerk Authentication'))
    console.log()

    // Summary
    console.log(pc.dim(`  Found ${providers.length} provider(s):`))

    if (providers.length === 0) {
      console.log(pc.dim('    (none)'))
    } else {
      for (const provider of providers) {
        const typeColor =
          provider.type === 'oauth'
            ? pc.blue
            : provider.type === 'passkey'
              ? pc.yellow
              : provider.type === 'credentials'
                ? pc.green
                : pc.cyan

        console.log(
          `    ${pc.cyan(provider.id)} ${pc.dim('(')}${typeColor(provider.type)}${pc.dim(')')}`
        )
      }
    }
    console.log()

    // Session strategy
    const sessionStrategy = authConfig?.session?.strategy ?? 'jwt'
    console.log(pc.dim('  Session strategy:'))
    console.log(
      `    ${sessionStrategy === 'database' ? pc.yellow('database') : pc.green('jwt')} ${pc.dim(sessionStrategy === 'database' ? '(requires D1)' : '(stateless)')}`
    )
    console.log()

    // Available commands
    console.log(pc.bold('Commands:'))
    console.log()
    console.log(
      pc.dim('  cloudwerk auth migrations     ') + 'Generate D1 migration files'
    )
    console.log()

    // Quick start hint
    if (providers.length === 0) {
      console.log(pc.bold('Quick Start:'))
      console.log()
      console.log(pc.dim('  Create a provider at app/auth/providers/github.ts:'))
      console.log()
      console.log(
        pc.cyan("    import { defineProvider, github } from '@cloudwerk/auth/convention'")
      )
      console.log()
      console.log(pc.cyan('    export default defineProvider('))
      console.log(pc.cyan('      github({'))
      console.log(pc.cyan('        clientId: process.env.GITHUB_CLIENT_ID!,'))
      console.log(pc.cyan('        clientSecret: process.env.GITHUB_CLIENT_SECRET!,'))
      console.log(pc.cyan('      })'))
      console.log(pc.cyan('    )'))
      console.log()
    }
  } catch (error) {
    handleCommandError(error, verbose)
  }
}
