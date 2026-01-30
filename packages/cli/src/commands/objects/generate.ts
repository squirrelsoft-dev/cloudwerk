/**
 * @cloudwerk/cli - Objects Generate Command
 *
 * Regenerate wrangler.toml durable object configuration.
 */

import pc from 'picocolors'
import {
  loadConfig,
  scanDurableObjects,
  buildDurableObjectManifest,
} from '@cloudwerk/core/build'
import { createLogger } from '../../utils/logger.js'
import { handleCommandError } from '../../utils/command-error-handler.js'
import { generateDurableObjectWrangler } from '../../utils/durable-object-wrangler.js'
import { generateDurableObjectTypes } from '../../utils/durable-object-type-generator.js'

// ============================================================================
// Types
// ============================================================================

export interface ObjectsGenerateOptions {
  /** Enable verbose output */
  verbose?: boolean
  /** Dry run - don't write files */
  dryRun?: boolean
  /** Skip type generation */
  skipTypes?: boolean
}

// ============================================================================
// Generate Command
// ============================================================================

/**
 * Regenerate wrangler.toml durable object configuration.
 */
export async function objectsGenerate(
  options: ObjectsGenerateOptions = {}
): Promise<void> {
  const verbose = options.verbose ?? false
  const dryRun = options.dryRun ?? false
  const skipTypes = options.skipTypes ?? false
  const logger = createLogger(verbose)

  try {
    const cwd = process.cwd()

    // Load config
    logger.debug('Loading configuration...')
    const config = await loadConfig(cwd)
    const appDir = config.appDir

    // Scan for durable objects
    logger.debug(`Scanning for durable objects in ${appDir}/objects/...`)
    const scanResult = await scanDurableObjects(appDir, {
      extensions: config.extensions,
    })

    // Build manifest
    const manifest = buildDurableObjectManifest(scanResult, appDir)

    console.log()
    console.log(pc.bold('Generating Durable Object Configuration'))
    console.log()

    if (manifest.durableObjects.length === 0) {
      console.log(pc.dim('  No durable objects found.'))
      console.log()
      console.log(pc.dim('  Create a durable object at app/objects/counter.ts first.'))
      console.log()
      return
    }

    // Show what will be generated
    console.log(pc.dim(`  Found ${manifest.durableObjects.length} durable object(s):`))
    for (const obj of manifest.durableObjects) {
      const storage = obj.sqlite ? pc.yellow('SQLite') : pc.green('KV')
      console.log(`    - ${pc.cyan(obj.className)} ${pc.dim('(')}${storage}${pc.dim(')')}`)
    }
    console.log()

    if (dryRun) {
      console.log(pc.yellow('  Dry run - no files will be written.'))
      console.log()
    }

    // Generate wrangler.toml configuration
    console.log(pc.dim('  Generating wrangler.toml bindings...'))
    const wranglerResult = generateDurableObjectWrangler(cwd, manifest, {
      dryRun,
      includeComments: true,
    })

    if (wranglerResult.changed) {
      console.log(pc.green(`    \u2713 Updated ${wranglerResult.wranglerPath}`))
    } else {
      console.log(pc.dim('    No changes needed'))
    }

    // Generate types
    if (!skipTypes) {
      console.log()
      console.log(pc.dim('  Generating TypeScript types...'))

      if (!dryRun) {
        const typesResult = generateDurableObjectTypes(cwd, manifest)
        console.log(pc.green(`    \u2713 Generated ${typesResult.file}`))
      } else {
        console.log(pc.dim('    Would generate .cloudwerk/types/durable-objects.d.ts'))
      }
    }

    console.log()

    // Show preview of generated TOML
    if (verbose || dryRun) {
      console.log(pc.dim('  Generated wrangler.toml section:'))
      console.log()
      for (const line of wranglerResult.generatedToml.split('\n')) {
        console.log(pc.cyan(`    ${line}`))
      }
      console.log()
    }

    // Show any errors
    if (manifest.errors.length > 0) {
      console.log(pc.red('  Errors:'))
      for (const error of manifest.errors) {
        console.log(pc.red(`    - ${error.file}: ${error.message}`))
      }
      console.log()
    }

    // Show any warnings
    if (manifest.warnings.length > 0) {
      console.log(pc.yellow('  Warnings:'))
      for (const warning of manifest.warnings) {
        console.log(pc.yellow(`    - ${warning.file}: ${warning.message}`))
      }
      console.log()
    }

    // Success message
    if (!dryRun) {
      console.log(pc.green('  Configuration generated successfully!'))
      console.log()
      console.log(pc.dim('  Next steps:'))
      console.log(pc.dim('    1. Review wrangler.toml for correctness'))
      console.log(pc.dim('    2. Add .cloudwerk/types to your tsconfig.json include'))
      console.log(pc.dim("    3. Run 'pnpm dev' to test locally"))
      console.log(pc.dim("    4. Run 'pnpm deploy' to deploy to Cloudflare"))
      console.log()
    }
  } catch (error) {
    handleCommandError(error, verbose)
  }
}
