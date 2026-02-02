/**
 * @cloudwerk/cli - Auth Migrations Command
 *
 * Generate D1 migration files for auth tables based on detected providers.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import pc from 'picocolors'
import { loadConfig } from '@cloudwerk/core/build'
import { createLogger } from '../../utils/logger.js'
import { handleCommandError } from '../../utils/command-error-handler.js'
import {
  scanAuthProviders,
  loadAuthConfig,
  generateUsersTableSQL,
  generateAccountsTableSQL,
  generateSessionsTableSQL,
  generateWebAuthnCredentialsTableSQL,
  generateVerificationTokensTableSQL,
} from '../../utils/auth-scanner.js'

// ============================================================================
// Types
// ============================================================================

export interface AuthMigrationsOptions {
  /** Enable verbose output */
  verbose?: boolean

  /** Output directory for migrations (default: ./migrations) */
  output?: string

  /** Dry run - show what would be created without writing */
  dryRun?: boolean
}

// ============================================================================
// Migrations Command
// ============================================================================

/**
 * Generate D1 migration files for auth tables.
 *
 * Detects providers and session config to determine which tables are needed:
 * - users: Always required
 * - accounts: Required for OAuth/OIDC providers
 * - sessions: Required when session strategy is 'database'
 * - webauthn_credentials: Required for passkey provider
 * - verification_tokens: Required for email provider
 */
export async function authMigrations(
  options: AuthMigrationsOptions = {}
): Promise<void> {
  const verbose = options.verbose ?? false
  const dryRun = options.dryRun ?? false
  const logger = createLogger(verbose)

  try {
    const cwd = process.cwd()

    // Load config
    logger.debug('Loading configuration...')
    const config = await loadConfig(cwd)
    const appDir = config.appDir

    // Scan for providers
    logger.debug(`Scanning for auth providers in ${appDir}/auth/providers/...`)
    const providers = await scanAuthProviders(appDir)

    // Load auth config
    logger.debug(`Loading auth config from ${appDir}/auth/config.ts...`)
    const authConfig = await loadAuthConfig(appDir)

    console.log()
    console.log(pc.bold('Auth Migrations Generator'))
    console.log()

    // Determine which tables are needed
    const tables: {
      name: string
      reason: string
      sql: string
    }[] = []

    // Users table is always needed
    tables.push({
      name: 'users',
      reason: 'Required for all auth',
      sql: generateUsersTableSQL(),
    })

    // Check provider types
    const hasOAuth = providers.some((p) => p.type === 'oauth' || p.type === 'oidc')
    const hasPasskey = providers.some((p) => p.type === 'passkey')
    const hasEmail = providers.some((p) => p.type === 'email')

    // Accounts table for OAuth/OIDC
    if (hasOAuth) {
      const oauthProviders = providers
        .filter((p) => p.type === 'oauth' || p.type === 'oidc')
        .map((p) => p.id)
        .join(', ')

      tables.push({
        name: 'accounts',
        reason: `Required for OAuth providers (${oauthProviders})`,
        sql: generateAccountsTableSQL(),
      })
    }

    // Sessions table for database strategy
    const sessionStrategy = authConfig?.session?.strategy ?? 'jwt'
    if (sessionStrategy === 'database') {
      tables.push({
        name: 'sessions',
        reason: 'Required for database session strategy',
        sql: generateSessionsTableSQL(),
      })
    }

    // WebAuthn credentials for passkey
    if (hasPasskey) {
      const passkeyProvider = providers.find((p) => p.type === 'passkey')
      tables.push({
        name: 'webauthn_credentials',
        reason: `Required for passkey provider (${passkeyProvider?.id})`,
        sql: generateWebAuthnCredentialsTableSQL(),
      })
    }

    // Verification tokens for email
    if (hasEmail) {
      const emailProvider = providers.find((p) => p.type === 'email')
      tables.push({
        name: 'verification_tokens',
        reason: `Required for email provider (${emailProvider?.id})`,
        sql: generateVerificationTokensTableSQL(),
      })
    }

    // Display detected config
    console.log(pc.dim('  Detected configuration:'))
    console.log(
      `    ${pc.cyan('Providers')}: ${providers.length === 0 ? pc.dim('(none)') : providers.map((p) => `${p.id} (${p.type})`).join(', ')}`
    )
    console.log(
      `    ${pc.cyan('Session')}: ${sessionStrategy === 'database' ? pc.yellow('database') : pc.green('jwt')}`
    )
    console.log()

    // Display tables to create
    console.log(pc.dim('  Tables to create:'))

    for (const table of tables) {
      console.log(`    ${pc.green('\u2713')} ${pc.cyan(table.name)} ${pc.dim(`- ${table.reason}`)}`)
    }
    console.log()

    // Generate migration file
    const outputDir = options.output ?? path.join(cwd, 'migrations')
    const migrationName = '0001_auth_tables.sql'
    const migrationPath = path.join(outputDir, migrationName)

    // Combine all SQL
    const migrationContent = [
      '-- Cloudwerk Auth Migration',
      '-- Generated by: cloudwerk auth migrations',
      `-- Date: ${new Date().toISOString()}`,
      '--',
      '-- This migration creates the following tables:',
      ...tables.map((t) => `--   - ${t.name}: ${t.reason}`),
      '',
      ...tables.map((t) => t.sql),
    ].join('\n')

    if (dryRun) {
      console.log(pc.bold('Dry run - Migration content:'))
      console.log()
      console.log(pc.dim('─'.repeat(60)))
      console.log(migrationContent)
      console.log(pc.dim('─'.repeat(60)))
      console.log()
      console.log(pc.dim(`  Would write to: ${migrationPath}`))
      console.log()
      return
    }

    // Check if migrations directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
      console.log(pc.dim(`  Created migrations directory: ${outputDir}`))
    }

    // Check if migration already exists
    if (fs.existsSync(migrationPath)) {
      console.log(pc.yellow(`  Migration already exists: ${migrationPath}`))
      console.log(pc.dim('  Use --dry-run to preview the migration content'))
      console.log(pc.dim('  Delete the existing file to regenerate'))
      console.log()
      return
    }

    // Write migration file
    fs.writeFileSync(migrationPath, migrationContent)
    console.log(pc.green(`  \u2713 Created migration: ${migrationPath}`))
    console.log()

    // Next steps
    console.log(pc.bold('Next steps:'))
    console.log()
    console.log(pc.dim('  1. Review the generated migration file'))
    console.log(pc.dim('  2. Apply with wrangler:'))
    console.log()
    console.log(pc.cyan('     wrangler d1 migrations apply <DATABASE_NAME> --local'))
    console.log()
    console.log(pc.dim('  3. For production:'))
    console.log()
    console.log(pc.cyan('     wrangler d1 migrations apply <DATABASE_NAME> --remote'))
    console.log()
  } catch (error) {
    handleCommandError(error, verbose)
  }
}
