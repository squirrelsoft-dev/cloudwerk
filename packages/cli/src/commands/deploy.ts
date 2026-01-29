/**
 * @cloudwerk/cli - Deploy Command
 *
 * Deploys the project to Cloudflare Workers using wrangler.
 */

import * as path from 'node:path'
import * as fs from 'node:fs'
import { spawn } from 'node:child_process'

import type { DeployCommandOptions } from '../types.js'
import { CliError } from '../types.js'
import { createLogger, printError } from '../utils/logger.js'
import { build } from './build.js'

// ============================================================================
// Deploy Command
// ============================================================================

/**
 * Deploy the project to Cloudflare Workers.
 *
 * Deployment pipeline:
 * 1. Verify wrangler.toml exists
 * 2. Run cloudwerk build (unless --skip-build)
 * 3. Execute wrangler deploy
 * 4. Display deployment URL on success
 *
 * @param pathArg - Optional working directory path
 * @param options - Command options
 */
export async function deploy(
  pathArg: string | undefined,
  options: DeployCommandOptions
): Promise<void> {
  const verbose = options.verbose ?? false
  const logger = createLogger(verbose)

  try {
    // Resolve working directory
    const cwd = pathArg
      ? path.resolve(process.cwd(), pathArg)
      : process.cwd()

    // Validate working directory exists
    if (!fs.existsSync(cwd)) {
      throw new CliError(
        `Directory does not exist: ${cwd}`,
        'ENOENT',
        `Make sure the path exists and try again.`
      )
    }

    logger.debug(`Working directory: ${cwd}`)

    // Check for wrangler.toml
    const wranglerPath = path.join(cwd, 'wrangler.toml')
    if (!fs.existsSync(wranglerPath)) {
      throw new CliError(
        `wrangler.toml not found in ${cwd}`,
        'ENOENT',
        `Create a wrangler.toml file or run this command from a directory containing one.`
      )
    }

    logger.debug(`Found wrangler.toml: ${wranglerPath}`)

    // Run build step unless --skip-build
    if (!options.skipBuild) {
      logger.info('Building project...')
      await build(pathArg, {
        config: options.config,
        verbose: options.verbose,
      })
      console.log()
    }

    // Build wrangler deploy command
    const args = ['wrangler', 'deploy']

    if (options.env) {
      args.push('--env', options.env)
    }

    if (options.dryRun) {
      args.push('--dry-run')
    }

    const envLabel = options.env ? ` to ${options.env}` : ''
    const dryRunLabel = options.dryRun ? ' (dry run)' : ''
    logger.info(`Deploying${envLabel}${dryRunLabel}...`)
    logger.debug(`Running: npx ${args.join(' ')}`)

    // Execute wrangler deploy
    const exitCode = await runCommand(args, cwd)

    if (exitCode !== 0) {
      throw new CliError(
        `Deployment failed with exit code ${exitCode}`,
        'EDEPLOY',
        `Check the wrangler output above for details.`
      )
    }

    if (!options.dryRun) {
      logger.success('Deployment complete!')
    } else {
      logger.success('Dry run complete!')
    }
  } catch (error) {
    if (error instanceof CliError) {
      printError(error.message, error.suggestion)
      process.exit(1)
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
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Run a command and stream output to stdout/stderr.
 * Returns the exit code.
 */
function runCommand(
  args: string[],
  cwd: string
): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn('npx', args, {
      cwd,
      stdio: 'inherit',
    })

    child.on('error', (error) => {
      reject(error)
    })

    child.on('close', (code) => {
      resolve(code ?? 0)
    })
  })
}
