/**
 * @cloudwerk/cli - Objects Migrations Command
 *
 * Show migration history for durable objects.
 */

import pc from 'picocolors'
import {
  loadConfig,
  scanDurableObjects,
  buildDurableObjectManifest,
} from '@cloudwerk/core/build'
import { createLogger } from '../../utils/logger.js'
import { handleCommandError } from '../../utils/command-error-handler.js'
import { findWranglerToml, readWranglerTomlRaw } from '../../utils/wrangler-toml.js'
import { extractExistingMigrationTags } from '../../utils/durable-object-wrangler.js'

// ============================================================================
// Types
// ============================================================================

export interface ObjectsMigrationsOptions {
  /** Enable verbose output */
  verbose?: boolean
}

// ============================================================================
// Migrations Command
// ============================================================================

/**
 * Show migration history for durable objects.
 */
export async function objectsMigrations(
  options: ObjectsMigrationsOptions = {}
): Promise<void> {
  const verbose = options.verbose ?? false
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
    console.log(pc.bold('Durable Object Migrations'))
    console.log()

    // Read wrangler.toml to find existing migrations
    const wranglerPath = findWranglerToml(cwd)

    if (!wranglerPath) {
      console.log(pc.dim('  No wrangler.toml found.'))
      console.log()
      console.log(pc.dim("  Run 'cloudwerk objects generate' to create configuration."))
      console.log()
      return
    }

    const content = readWranglerTomlRaw(cwd)
    const tags = extractExistingMigrationTags(content)

    if (tags.length === 0) {
      console.log(pc.dim('  No migrations found in wrangler.toml.'))
      console.log()

      if (manifest.durableObjects.length > 0) {
        console.log(pc.dim("  Run 'cloudwerk objects generate' to create migrations."))
        console.log()
      }
      return
    }

    // Display migrations
    console.log(pc.dim(`  Found ${tags.length} migration(s):`))
    console.log()

    for (let i = 0; i < tags.length; i++) {
      const tag = tags[i]
      const isLatest = i === tags.length - 1

      console.log(
        `    ${isLatest ? pc.green('\u25CF') : pc.dim('\u25CB')} ${pc.cyan(tag)}${isLatest ? pc.green(' (current)') : ''}`
      )
    }

    console.log()

    // Current state
    console.log(pc.dim('  Current durable objects:'))
    console.log()

    if (manifest.durableObjects.length === 0) {
      console.log(pc.dim('    No durable objects defined.'))
    } else {
      for (const obj of manifest.durableObjects) {
        const storage = obj.sqlite ? pc.yellow('SQLite') : pc.green('KV')
        console.log(`    ${pc.cyan(obj.className)} ${pc.dim('(')}${storage}${pc.dim(')')}`)
      }
    }

    console.log()

    // Hints
    console.log(pc.dim('  Tips:'))
    console.log(pc.dim('    - Migrations are applied automatically on deploy'))
    console.log(pc.dim('    - Each tag should be unique and incremental'))
    console.log(
      pc.dim('    - Deleting a class will delete all data for that class')
    )
    console.log()
  } catch (error) {
    handleCommandError(error, verbose)
  }
}
