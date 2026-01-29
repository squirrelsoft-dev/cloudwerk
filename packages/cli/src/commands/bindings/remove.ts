/**
 * @cloudwerk/cli - Bindings Remove Command
 *
 * Remove Cloudflare bindings from wrangler.toml.
 */

import pc from 'picocolors'
import { confirm, select } from '@inquirer/prompts'

import type { BindingsRemoveCommandOptions } from '../../types.js'
import { CliError } from '../../types.js'
import { createLogger } from '../../utils/logger.js'
import { handleCommandError } from '../../utils/command-error-handler.js'
import {
  findWranglerToml,
  readWranglerToml,
  extractBindings,
  removeBinding,
  getBindingTypeName,
} from '../../utils/wrangler-toml.js'
import { generateEnvTypes } from '../../utils/env-types.js'

// ============================================================================
// Remove Binding Command
// ============================================================================

/**
 * Remove a binding from wrangler.toml.
 *
 * @param bindingName - Name of the binding to remove (optional - will prompt if not provided)
 * @param options - Command options
 */
export async function bindingsRemove(
  bindingName: string | undefined,
  options: BindingsRemoveCommandOptions
): Promise<void> {
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
    const bindings = extractBindings(config, env)

    if (bindings.length === 0) {
      const envLabel = env ? ` in ${env}` : ''
      throw new CliError(
        `No bindings found${envLabel}`,
        'ENOENT',
        `Use 'cloudwerk bindings add' to add a binding first.`
      )
    }

    // If no binding name provided, prompt for one
    let targetBinding = bindingName

    if (!targetBinding) {
      targetBinding = await select({
        message: 'Select a binding to remove:',
        choices: bindings.map((b) => ({
          name: `${b.name} (${getBindingTypeName(b.type)})`,
          value: b.name,
        })),
      })
    }

    // Verify binding exists
    const binding = bindings.find((b) => b.name === targetBinding)
    if (!binding) {
      const envLabel = env ? ` in ${env}` : ''
      throw new CliError(
        `Binding "${targetBinding}" not found${envLabel}`,
        'ENOENT',
        `Use 'cloudwerk bindings' to see available bindings.`
      )
    }

    // Confirm removal
    if (!options.force) {
      const confirmed = await confirm({
        message: `Remove binding "${targetBinding}" (${getBindingTypeName(binding.type)})?`,
        default: false,
      })

      if (!confirmed) {
        console.log(pc.dim('Cancelled.'))
        return
      }
    }

    console.log()

    // Remove the binding
    const removed = removeBinding(cwd, targetBinding, env)

    if (!removed) {
      throw new CliError(
        `Failed to remove binding "${targetBinding}"`,
        'EREMOVE',
        'The binding may have already been removed.'
      )
    }

    console.log(pc.green('\u2713') + ` Removed binding "${targetBinding}" from wrangler.toml`)

    // Regenerate types
    if (!options.skipTypes) {
      const updatedConfig = readWranglerToml(cwd)
      const updatedBindings = extractBindings(updatedConfig)

      if (updatedBindings.length > 0) {
        const result = generateEnvTypes(cwd, updatedBindings)
        console.log(
          pc.green('\u2713') +
            ` Updated env.d.ts with ${result.bindingCount} binding(s)`
        )
      } else {
        console.log(
          pc.dim('Note: No bindings remain. Consider removing env.d.ts manually.')
        )
      }
    }

    console.log()
    logger.success('Binding removed successfully!')

    // Show note about resources
    console.log()
    console.log(
      pc.dim(
        'Note: The Cloudflare resource itself was not deleted. Use wrangler to delete the resource if needed.'
      )
    )
    console.log()
  } catch (error) {
    handleCommandError(error, verbose)
  }
}
