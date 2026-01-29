/**
 * @cloudwerk/cli - Bindings Generate Types Command
 *
 * Regenerate TypeScript type definitions for Cloudflare bindings.
 */

import pc from 'picocolors'

import type { BindingsCommandOptions } from '../../types.js'
import { CliError } from '../../types.js'
import { createLogger } from '../../utils/logger.js'
import { handleCommandError } from '../../utils/command-error-handler.js'
import {
  findWranglerToml,
  readWranglerToml,
  extractBindings,
} from '../../utils/wrangler-toml.js'
import { generateEnvTypes } from '../../utils/env-types.js'

// ============================================================================
// Generate Types Command
// ============================================================================

/**
 * Regenerate env.d.ts from wrangler.toml bindings.
 *
 * @param options - Command options
 */
export async function bindingsGenerateTypes(
  options: BindingsCommandOptions
): Promise<void> {
  const verbose = options.verbose ?? false
  const logger = createLogger(verbose)

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

    // Read config and extract bindings
    const config = readWranglerToml(cwd)
    const bindings = extractBindings(config)

    if (bindings.length === 0) {
      console.log()
      console.log(pc.yellow('No bindings found in wrangler.toml.'))
      console.log()
      console.log(
        pc.dim(`Use 'cloudwerk bindings add' to add a binding first.`)
      )
      console.log()
      return
    }

    console.log()
    logger.info('Generating TypeScript types...')

    // Generate types
    const result = generateEnvTypes(cwd, bindings)

    console.log()
    console.log(
      pc.green('\u2713') +
        ` Updated ${pc.bold('env.d.ts')} with ${result.bindingCount} binding(s):`
    )
    console.log()

    for (const binding of result.bindings) {
      console.log(`    ${pc.cyan(binding.name)}: ${pc.dim(binding.type)}`)
    }

    console.log()
    logger.success('Types generated successfully!')
    console.log()

    // Show usage hint
    console.log(
      pc.dim('Make sure env.d.ts is included in your tsconfig.json:')
    )
    console.log(
      pc.dim('  "include": ["env.d.ts", "app/**/*"]')
    )
    console.log()
  } catch (error) {
    handleCommandError(error, verbose)
  }
}
