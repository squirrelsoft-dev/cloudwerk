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
import { generateCloudwerkTypes } from '../../utils/type-generator.js'
import { updateTsConfigPaths } from '../../utils/tsconfig-updater.js'

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

    // Generate env.d.ts (legacy types)
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

    // Generate .cloudwerk/types/ (new importable singletons)
    logger.debug('Generating .cloudwerk/types/...')
    const cloudwerkResult = generateCloudwerkTypes(cwd, bindings)

    console.log()
    console.log(
      pc.green('\u2713') +
        ` Generated ${pc.bold('.cloudwerk/types/')} for importable bindings:`
    )
    console.log(`    ${pc.dim(cloudwerkResult.files.bindings)}`)
    console.log(`    ${pc.dim(cloudwerkResult.files.context)}`)

    // Update tsconfig.json
    logger.debug('Updating tsconfig.json...')
    const tsconfigResult = updateTsConfigPaths(cwd)

    if (tsconfigResult.modified) {
      console.log()
      console.log(
        pc.green('\u2713') +
          ` Updated ${pc.bold('tsconfig.json')}:`
      )
      if (tsconfigResult.changes.setBaseUrl) {
        console.log(`    ${pc.dim('Added baseUrl: "."')}`)
      }
      for (const pathKey of tsconfigResult.changes.addedPaths) {
        console.log(`    ${pc.dim(`Added paths: "${pathKey}"`)}`)
      }
      for (const include of tsconfigResult.changes.addedIncludes) {
        console.log(`    ${pc.dim(`Added include: "${include}"`)}`)
      }
    } else {
      logger.debug('tsconfig.json already configured')
    }

    console.log()
    logger.success('Types generated successfully!')
    console.log()

    // Show usage hint
    console.log(pc.bold('Usage:'))
    console.log()
    console.log(pc.dim('  // Import bindings directly (new)'))
    console.log(pc.cyan(`  import { ${bindings[0]?.name || 'DB'} } from '@cloudwerk/core/bindings'`))
    console.log()
    console.log(pc.dim('  // Import context helpers (new)'))
    console.log(pc.cyan(`  import { params, request, get } from '@cloudwerk/core/context'`))
    console.log()
    console.log(pc.dim('  // Or use getContext() (existing)'))
    console.log(pc.cyan(`  import { getContext } from '@cloudwerk/core'`))
    console.log()
  } catch (error) {
    handleCommandError(error, verbose)
  }
}
