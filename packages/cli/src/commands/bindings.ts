/**
 * @cloudwerk/cli - Bindings Command
 *
 * View and manage Cloudflare bindings in wrangler.toml.
 */

import * as path from 'node:path'
import pc from 'picocolors'

import type { BindingsCommandOptions } from '../types.js'
import { CliError } from '../types.js'
import { createLogger } from '../utils/logger.js'
import { handleCommandError } from '../utils/command-error-handler.js'
import {
  findWranglerToml,
  readWranglerToml,
  extractBindings,
  getEnvironments,
  getBindingTypeName,
  truncateId,
} from '../utils/wrangler-toml.js'

// ============================================================================
// View Bindings Command
// ============================================================================

/**
 * Display all bindings configured in wrangler.toml.
 *
 * @param options - Command options
 */
export async function bindings(options: BindingsCommandOptions): Promise<void> {
  const verbose = options.verbose ?? false
  const logger = createLogger(verbose)
  const env = options.env

  try {
    const cwd = process.cwd()

    // Check for wrangler.toml
    const wranglerPath = findWranglerToml(cwd)
    if (!wranglerPath) {
      throw new CliError(
        'wrangler.toml not found',
        'ENOENT',
        'Create a wrangler.toml file or run this command from a Cloudwerk project directory.'
      )
    }

    logger.debug(`Found wrangler config: ${wranglerPath}`)

    // Read config
    const config = readWranglerToml(cwd)
    const projectName = config.name || path.basename(cwd)

    // Extract bindings for the specified environment
    const bindingsList = extractBindings(config, env)
    const environments = getEnvironments(config)

    // Display header
    console.log()
    const envLabel = env ? env : 'production'
    console.log(
      pc.bold(`Bindings for ${projectName}`) + pc.dim(` (${envLabel}):`)
    )
    console.log()

    if (bindingsList.length === 0) {
      console.log(pc.dim('  No bindings configured.'))
      console.log()
      console.log(
        pc.dim(
          `  Use 'cloudwerk bindings add' to add a new binding${env ? ` --env ${env}` : ''}.`
        )
      )
    } else {
      // Display table header
      console.log(
        pc.dim('  Type            Binding        Resource')
      )
      console.log(
        pc.dim('  ' + '\u2500'.repeat(14) + '  ' + '\u2500'.repeat(13) + '  ' + '\u2500'.repeat(30))
      )

      // Display bindings
      for (const binding of bindingsList) {
        const typeName = getBindingTypeName(binding.type).padEnd(14)
        const bindingName = binding.name.padEnd(13)
        let resource = ''

        if (binding.resourceName && binding.resourceId) {
          resource = `${binding.resourceName} (${truncateId(binding.resourceId)})`
        } else if (binding.resourceName) {
          resource = binding.resourceName
        } else if (binding.resourceId) {
          resource = `(${truncateId(binding.resourceId)})`
        } else {
          resource = pc.dim('(configured)')
        }

        console.log(`  ${pc.cyan(typeName)}  ${pc.bold(bindingName)}  ${resource}`)
      }
    }

    console.log()

    // Show available environments
    if (environments.length > 0 && !env) {
      console.log(
        pc.dim('Environments: ') + environments.join(', ')
      )
      console.log()
    }

    // Show hints
    const envFlag = env ? ` --env ${env}` : ''
    console.log(pc.dim(`Use 'cloudwerk bindings add${envFlag}' to add a new binding.`))
    if (!env && environments.length > 0) {
      console.log(
        pc.dim(`Use 'cloudwerk bindings --env <name>' to view environment bindings.`)
      )
    }
    console.log()
  } catch (error) {
    handleCommandError(error, verbose)
  }
}
