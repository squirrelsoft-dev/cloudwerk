/**
 * @cloudwerk/cli - Objects Command
 *
 * Main entry point for the objects command group.
 * Displays an overview of durable objects when called without a subcommand.
 */

import pc from 'picocolors'
import {
  loadConfig,
  scanDurableObjects,
  buildDurableObjectManifest,
} from '@cloudwerk/core/build'
import { createLogger } from '../utils/logger.js'
import { handleCommandError } from '../utils/command-error-handler.js'

// ============================================================================
// Types
// ============================================================================

export interface ObjectsCommandOptions {
  /** Enable verbose output */
  verbose?: boolean
}

// ============================================================================
// Objects Command
// ============================================================================

/**
 * Display durable objects overview and available subcommands.
 */
export async function objects(options: ObjectsCommandOptions = {}): Promise<void> {
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
    console.log(pc.bold('Cloudwerk Durable Objects'))
    console.log()

    // Summary
    const sqliteCount = manifest.durableObjects.filter((o) => o.sqlite).length
    const regularCount = manifest.durableObjects.length - sqliteCount

    console.log(pc.dim(`  Found ${manifest.durableObjects.length} durable objects:`))
    if (manifest.durableObjects.length > 0) {
      console.log(pc.dim(`    - ${sqliteCount} with SQLite storage`))
      console.log(pc.dim(`    - ${regularCount} with KV storage`))
    }
    console.log()

    // List objects briefly
    if (manifest.durableObjects.length > 0) {
      for (const obj of manifest.durableObjects) {
        const storage = obj.sqlite
          ? pc.yellow('SQLite')
          : pc.green('KV')
        const methods = obj.methodNames.length > 0
          ? pc.dim(`${obj.methodNames.length} methods`)
          : pc.dim('no methods')
        console.log(
          `    ${pc.cyan(obj.className)} ${pc.dim('(')}${storage}${pc.dim(', ')}${methods}${pc.dim(')')}`
        )
      }
      console.log()
    }

    // Available commands
    console.log(pc.bold('Commands:'))
    console.log()
    console.log(pc.dim('  cloudwerk objects list           ') + 'List all durable objects')
    console.log(pc.dim('  cloudwerk objects info <name>    ') + 'Show durable object details')
    console.log(pc.dim('  cloudwerk objects migrations     ') + 'Show migration history')
    console.log(pc.dim('  cloudwerk objects generate       ') + 'Regenerate wrangler config')
    console.log()

    // Quick start hint
    if (manifest.durableObjects.length === 0) {
      console.log(pc.bold('Quick Start:'))
      console.log()
      console.log(pc.dim('  Create a durable object at app/objects/counter.ts:'))
      console.log()
      console.log(pc.cyan("    import { defineDurableObject } from '@cloudwerk/durable-object'"))
      console.log()
      console.log(pc.cyan('    interface CounterState { value: number }'))
      console.log()
      console.log(pc.cyan('    export default defineDurableObject<CounterState>({'))
      console.log(pc.cyan('      init: () => ({ value: 0 }),'))
      console.log()
      console.log(pc.cyan('      methods: {'))
      console.log(pc.cyan('        async increment(amount = 1) {'))
      console.log(pc.cyan('          this.state.value += amount'))
      console.log(pc.cyan('          return this.state.value'))
      console.log(pc.cyan('        }'))
      console.log(pc.cyan('      }'))
      console.log(pc.cyan('    })'))
      console.log()
      console.log(pc.dim('  Then use it in your routes:'))
      console.log()
      console.log(pc.cyan("    import { durableObjects } from '@cloudwerk/core/bindings'"))
      console.log()
      console.log(pc.cyan('    export async function POST(request, { params }) {'))
      console.log(pc.cyan('      const id = durableObjects.Counter.idFromName(params.id)'))
      console.log(pc.cyan('      const counter = durableObjects.Counter.get(id)'))
      console.log(pc.cyan('      const value = await counter.increment(1)'))
      console.log(pc.cyan('      return Response.json({ value })'))
      console.log(pc.cyan('    }'))
      console.log()
    }
  } catch (error) {
    handleCommandError(error, verbose)
  }
}
