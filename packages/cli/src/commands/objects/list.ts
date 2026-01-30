/**
 * @cloudwerk/cli - Objects List Command
 *
 * List all durable objects discovered in app/objects/.
 */

import pc from 'picocolors'
import {
  loadConfig,
  scanDurableObjects,
  buildDurableObjectManifest,
} from '@cloudwerk/core/build'
import { createLogger } from '../../utils/logger.js'
import { handleCommandError } from '../../utils/command-error-handler.js'

// ============================================================================
// Types
// ============================================================================

export interface ObjectsListOptions {
  /** Enable verbose output */
  verbose?: boolean
  /** Output format */
  format?: 'table' | 'json'
}

// ============================================================================
// List Command
// ============================================================================

/**
 * List all durable objects discovered in app/objects/.
 */
export async function objectsList(options: ObjectsListOptions = {}): Promise<void> {
  const verbose = options.verbose ?? false
  const format = options.format ?? 'table'
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

    if (format === 'json') {
      console.log(JSON.stringify(manifest, null, 2))
      return
    }

    // Table output
    console.log()
    console.log(
      pc.bold('Durable Objects') +
        pc.dim(` (${manifest.durableObjects.length} found):`)
    )
    console.log()

    if (manifest.durableObjects.length === 0) {
      console.log(pc.dim('  No durable objects found.'))
      console.log()
      console.log(pc.dim('  Create a durable object at app/objects/counter.ts:'))
      console.log()
      console.log(pc.dim("    import { defineDurableObject } from '@cloudwerk/durable-object'"))
      console.log(pc.dim('    export default defineDurableObject({'))
      console.log(pc.dim('      methods: {'))
      console.log(pc.dim('        async increment(amount) { ... }'))
      console.log(pc.dim('      }'))
      console.log(pc.dim('    })'))
      console.log()
      return
    }

    // Display table header
    console.log(
      pc.dim(
        '  Class              Binding              Storage   Methods  Handlers'
      )
    )
    console.log(
      pc.dim(
        '  ' +
          '\u2500'.repeat(18) +
          '  ' +
          '\u2500'.repeat(18) +
          '  ' +
          '\u2500'.repeat(7) +
          '  ' +
          '\u2500'.repeat(7) +
          '  ' +
          '\u2500'.repeat(20)
      )
    )

    // Display durable objects
    for (const obj of manifest.durableObjects) {
      const className = obj.className.padEnd(18)
      const binding = obj.bindingName.padEnd(18)
      const storage = obj.sqlite
        ? pc.yellow('SQLite ')
        : pc.green('KV     ')
      const methods = obj.methodNames.length.toString().padEnd(7)

      // Build handlers string
      const handlers: string[] = []
      if (obj.hasFetch) handlers.push('fetch')
      if (obj.hasAlarm) handlers.push('alarm')
      if (obj.hasWebSocket) handlers.push('websocket')
      const handlersStr =
        handlers.length > 0 ? handlers.join(', ') : pc.dim('none')

      console.log(
        `  ${pc.cyan(className)}  ${pc.dim(binding)}  ${storage}  ${methods}  ${handlersStr}`
      )
    }

    console.log()

    // Show errors if any
    if (manifest.errors.length > 0) {
      console.log(pc.red('Errors:'))
      for (const error of manifest.errors) {
        console.log(pc.red(`  - ${error.file}: ${error.message}`))
      }
      console.log()
    }

    // Show warnings if any
    if (manifest.warnings.length > 0) {
      console.log(pc.yellow('Warnings:'))
      for (const warning of manifest.warnings) {
        console.log(pc.yellow(`  - ${warning.file}: ${warning.message}`))
      }
      console.log()
    }

    // Hints
    console.log(pc.dim("Use 'cloudwerk objects info <name>' for details."))
    console.log(pc.dim("Use 'cloudwerk objects generate' to update wrangler.toml."))
    console.log()
  } catch (error) {
    handleCommandError(error, verbose)
  }
}
