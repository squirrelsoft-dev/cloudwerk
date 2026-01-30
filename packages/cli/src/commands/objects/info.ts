/**
 * @cloudwerk/cli - Objects Info Command
 *
 * Show detailed information about a specific durable object.
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

export interface ObjectsInfoOptions {
  /** Enable verbose output */
  verbose?: boolean
  /** Output format */
  format?: 'table' | 'json'
}

// ============================================================================
// Info Command
// ============================================================================

/**
 * Show detailed information about a specific durable object.
 */
export async function objectsInfo(
  name: string,
  options: ObjectsInfoOptions = {}
): Promise<void> {
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

    // Find the durable object
    const obj = manifest.durableObjects.find(
      (o) =>
        o.name === name ||
        o.className === name ||
        o.bindingName === name
    )

    if (!obj) {
      console.log()
      console.log(pc.red(`Durable object '${name}' not found.`))
      console.log()

      if (manifest.durableObjects.length > 0) {
        console.log(pc.dim('Available durable objects:'))
        for (const o of manifest.durableObjects) {
          console.log(pc.dim(`  - ${o.className} (${o.name})`))
        }
      } else {
        console.log(pc.dim('No durable objects found in app/objects/.'))
      }
      console.log()
      return
    }

    if (format === 'json') {
      console.log(JSON.stringify(obj, null, 2))
      return
    }

    // Display info
    console.log()
    console.log(pc.bold(`Durable Object: ${obj.className}`))
    console.log()

    // Basic info
    console.log(pc.dim('  Configuration:'))
    console.log(`    Name:         ${pc.cyan(obj.name)}`)
    console.log(`    Class:        ${pc.cyan(obj.className)}`)
    console.log(`    Binding:      ${pc.yellow(obj.bindingName)}`)
    console.log(`    File:         ${pc.dim(obj.filePath)}`)
    console.log(
      `    Storage:      ${obj.sqlite ? pc.yellow('SQLite') : pc.green('KV')}`
    )
    console.log()

    // Handlers
    console.log(pc.dim('  Handlers:'))
    console.log(
      `    fetch:        ${obj.hasFetch ? pc.green('yes') : pc.dim('no')}`
    )
    console.log(
      `    alarm:        ${obj.hasAlarm ? pc.green('yes') : pc.dim('no')}`
    )
    console.log(
      `    webSocket:    ${obj.hasWebSocket ? pc.green('yes') : pc.dim('no')}`
    )
    console.log()

    // RPC Methods
    console.log(pc.dim('  RPC Methods:'))
    if (obj.methodNames.length > 0) {
      for (const method of obj.methodNames) {
        console.log(`    - ${pc.cyan(method)}()`)
      }
    } else {
      console.log(pc.dim('    No RPC methods defined'))
    }
    console.log()

    // wrangler.toml snippet
    console.log(pc.dim('  wrangler.toml binding:'))
    console.log()
    console.log(pc.cyan('    [durable_objects]'))
    console.log(pc.cyan('    bindings = ['))
    console.log(
      pc.cyan(
        `      { name = "${obj.bindingName}", class_name = "${obj.className}" }`
      )
    )
    console.log(pc.cyan('    ]'))
    console.log()
    console.log(pc.cyan('    [[migrations]]'))
    console.log(pc.cyan('    tag = "v1"'))
    if (obj.sqlite) {
      console.log(pc.cyan(`    new_sqlite_classes = ["${obj.className}"]`))
    } else {
      console.log(pc.cyan(`    new_classes = ["${obj.className}"]`))
    }
    console.log()

    // Usage example
    console.log(pc.dim('  Usage in routes:'))
    console.log()
    console.log(pc.cyan("    import { durableObjects } from '@cloudwerk/core/bindings'"))
    console.log()
    console.log(pc.cyan('    export async function POST(request, { params }) {'))
    console.log(
      pc.cyan(`      const id = durableObjects.${obj.className}.idFromName(params.id)`)
    )
    console.log(
      pc.cyan(`      const stub = durableObjects.${obj.className}.get(id)`)
    )
    if (obj.methodNames.length > 0) {
      console.log(
        pc.cyan(`      const result = await stub.${obj.methodNames[0]}()`)
      )
    } else if (obj.hasFetch) {
      console.log(pc.cyan('      const response = await stub.fetch(request)'))
    }
    console.log(pc.cyan('      return Response.json({ result })'))
    console.log(pc.cyan('    }'))
    console.log()
  } catch (error) {
    handleCommandError(error, verbose)
  }
}
