/**
 * @cloudwerk/cli - Services List Command
 *
 * List all services discovered in app/services/.
 */

import pc from 'picocolors'
import { loadConfig, scanServices, buildServiceManifest } from '@cloudwerk/core/build'
import { createLogger } from '../../utils/logger.js'
import { handleCommandError } from '../../utils/command-error-handler.js'

// ============================================================================
// Types
// ============================================================================

export interface ServicesListOptions {
  /** Enable verbose output */
  verbose?: boolean
  /** Output format */
  format?: 'table' | 'json'
}

// ============================================================================
// List Command
// ============================================================================

/**
 * List all services discovered in app/services/.
 */
export async function servicesList(options: ServicesListOptions = {}): Promise<void> {
  const verbose = options.verbose ?? false
  const format = options.format ?? 'table'
  const logger = createLogger(verbose)

  try {
    const cwd = process.cwd()

    // Load config
    logger.debug('Loading configuration...')
    const config = await loadConfig(cwd)
    const appDir = config.appDir

    // Scan for services
    logger.debug(`Scanning for services in ${appDir}/services/...`)
    const scanResult = await scanServices(appDir, { extensions: config.extensions })

    // Build manifest
    const manifest = buildServiceManifest(scanResult, appDir)

    if (format === 'json') {
      console.log(JSON.stringify(manifest, null, 2))
      return
    }

    // Table output
    console.log()
    console.log(pc.bold('Services') + pc.dim(` (${manifest.services.length} found):`))
    console.log()

    if (manifest.services.length === 0) {
      console.log(pc.dim('  No services found.'))
      console.log()
      console.log(pc.dim('  Create a service at app/services/<name>/service.ts:'))
      console.log()
      console.log(pc.dim("    import { defineService } from '@cloudwerk/service'"))
      console.log(pc.dim('    export default defineService({'))
      console.log(pc.dim('      methods: {'))
      console.log(pc.dim('        async myMethod(params) { ... }'))
      console.log(pc.dim('      }'))
      console.log(pc.dim('    })'))
      console.log()
      return
    }

    // Display table header
    console.log(pc.dim('  Name              Mode       Methods  Bindings'))
    console.log(pc.dim('  ' + '\u2500'.repeat(16) + '  ' + '\u2500'.repeat(9) + '  ' + '\u2500'.repeat(7) + '  ' + '\u2500'.repeat(20)))

    // Display services
    for (const service of manifest.services) {
      const name = service.name.padEnd(16)
      const mode = service.mode === 'extracted'
        ? pc.yellow('extracted')
        : pc.green('local    ')
      const methods = service.methodNames.length.toString().padEnd(7)
      const bindings = service.requiredBindings.length > 0
        ? service.requiredBindings.join(', ')
        : pc.dim('none')

      console.log(`  ${pc.cyan(name)}  ${mode}  ${methods}  ${bindings}`)
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
    console.log(pc.dim("Use 'cloudwerk services info <name>' for details."))
    console.log(pc.dim("Use 'cloudwerk services extract <name>' to extract a service."))
    console.log()
  } catch (error) {
    handleCommandError(error, verbose)
  }
}
