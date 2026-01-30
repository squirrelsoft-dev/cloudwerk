/**
 * @cloudwerk/cli - Services Command
 *
 * Main entry point for the services command group.
 * Displays an overview of services when called without a subcommand.
 */

import pc from 'picocolors'
import { loadConfig, scanServices, buildServiceManifest } from '@cloudwerk/core/build'
import { createLogger } from '../utils/logger.js'
import { handleCommandError } from '../utils/command-error-handler.js'

// ============================================================================
// Types
// ============================================================================

export interface ServicesCommandOptions {
  /** Enable verbose output */
  verbose?: boolean
}

// ============================================================================
// Services Command
// ============================================================================

/**
 * Display services overview and available subcommands.
 */
export async function services(options: ServicesCommandOptions = {}): Promise<void> {
  const verbose = options.verbose ?? false
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

    console.log()
    console.log(pc.bold('Cloudwerk Services'))
    console.log()

    // Summary
    const localCount = manifest.services.filter((s) => s.mode === 'local').length
    const extractedCount = manifest.services.filter((s) => s.mode === 'extracted').length

    console.log(pc.dim(`  Found ${manifest.services.length} services:`))
    if (manifest.services.length > 0) {
      console.log(pc.dim(`    - ${localCount} local (direct calls)`))
      console.log(pc.dim(`    - ${extractedCount} extracted (separate Workers)`))
    }
    console.log()

    // List services briefly
    if (manifest.services.length > 0) {
      for (const service of manifest.services) {
        const mode = service.mode === 'extracted' ? pc.yellow('extracted') : pc.green('local')
        console.log(`    ${pc.cyan(service.name)} ${pc.dim('(')}${mode}${pc.dim(')')}`)
      }
      console.log()
    }

    // Available commands
    console.log(pc.bold('Commands:'))
    console.log()
    console.log(pc.dim('  cloudwerk services list           ') + 'List all services')
    console.log(pc.dim('  cloudwerk services info <name>    ') + 'Show service details')
    console.log(pc.dim('  cloudwerk services extract <name> ') + 'Extract to separate Worker')
    console.log(pc.dim('  cloudwerk services inline <name>  ') + 'Convert back to local mode')
    console.log(pc.dim('  cloudwerk services deploy <name>  ') + 'Deploy extracted service')
    console.log(pc.dim('  cloudwerk services status         ') + 'Show all services status')
    console.log()

    // Quick start hint
    if (manifest.services.length === 0) {
      console.log(pc.bold('Quick Start:'))
      console.log()
      console.log(pc.dim('  Create a service at app/services/<name>/service.ts:'))
      console.log()
      console.log(pc.cyan("    import { defineService } from '@cloudwerk/service'"))
      console.log()
      console.log(pc.cyan('    export default defineService({'))
      console.log(pc.cyan('      methods: {'))
      console.log(pc.cyan('        async send({ to, subject, body }) {'))
      console.log(pc.cyan('          // Your service logic here'))
      console.log(pc.cyan('          return { success: true }'))
      console.log(pc.cyan('        }'))
      console.log(pc.cyan('      }'))
      console.log(pc.cyan('    })'))
      console.log()
      console.log(pc.dim('  Then use it in your routes:'))
      console.log()
      console.log(pc.cyan("    import { services } from '@cloudwerk/core/bindings'"))
      console.log()
      console.log(pc.cyan('    export async function POST() {'))
      console.log(pc.cyan("      const result = await services.email.send({ to: '...' })"))
      console.log(pc.cyan('      return json(result)'))
      console.log(pc.cyan('    }'))
      console.log()
    }
  } catch (error) {
    handleCommandError(error, verbose)
  }
}
