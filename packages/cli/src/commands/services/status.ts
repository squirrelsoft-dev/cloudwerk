/**
 * @cloudwerk/cli - Services Status Command
 *
 * Show the status of all services including local and extracted.
 */

import pc from 'picocolors'
import { loadConfig, scanServices, buildServiceManifest } from '@cloudwerk/core/build'
import { createLogger } from '../../utils/logger.js'
import { handleCommandError } from '../../utils/command-error-handler.js'
import { serviceWorkerExists, getExtractedServiceDirs } from '../../utils/service-worker-generator.js'
import { hasServiceInWrangler } from '../../utils/service-wrangler.js'

// ============================================================================
// Types
// ============================================================================

export interface ServicesStatusOptions {
  /** Enable verbose output */
  verbose?: boolean
}

// ============================================================================
// Status Command
// ============================================================================

/**
 * Show the status of all services.
 *
 * Displays:
 * - All discovered services and their modes
 * - Whether extracted workers exist
 * - Whether service bindings are configured
 * - Any issues or warnings
 */
export async function servicesStatus(options: ServicesStatusOptions = {}): Promise<void> {
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
    console.log(pc.bold('Services Status'))
    console.log()

    if (manifest.services.length === 0) {
      console.log(pc.dim('  No services found in app/services/'))
      console.log()
      return
    }

    // Count by mode
    const localCount = manifest.services.filter((s) => s.mode === 'local').length
    const extractedCount = manifest.services.filter((s) => s.mode === 'extracted').length

    console.log(pc.dim(`  Total:     ${manifest.services.length} services`))
    console.log(pc.dim(`  Local:     ${localCount}`))
    console.log(pc.dim(`  Extracted: ${extractedCount}`))
    console.log()

    // Table header
    console.log(pc.dim('  Service           Mode       Worker Files  Binding'))
    console.log(pc.dim('  ' + '\u2500'.repeat(16) + '  ' + '\u2500'.repeat(9) + '  ' + '\u2500'.repeat(12) + '  ' + '\u2500'.repeat(10)))

    // Display each service
    for (const service of manifest.services) {
      const name = service.name.padEnd(16)
      const mode = service.mode === 'extracted'
        ? pc.yellow('extracted')
        : pc.green('local    ')

      // Check if extracted worker files exist
      const hasFiles = serviceWorkerExists(cwd, service.name)
      const filesStatus = hasFiles
        ? pc.green('\u2713 generated ')
        : pc.dim('- not needed')

      // Check if binding is configured in wrangler.toml
      const hasBinding = hasServiceInWrangler(cwd, service.name)
      const bindingStatus = service.mode === 'extracted'
        ? (hasBinding ? pc.green('\u2713 yes') : pc.yellow('\u2717 missing'))
        : pc.dim('n/a       ')

      console.log(`  ${pc.cyan(name)}  ${mode}  ${filesStatus}  ${bindingStatus}`)
    }

    console.log()

    // Get orphaned extracted directories (workers without services)
    const extractedDirs = getExtractedServiceDirs(cwd)
    const serviceWorkerNames = manifest.services.map((s) => s.workerName)
    const orphanedDirs = extractedDirs.filter((dir) => {
      const dirName = dir.split('/').pop() || ''
      return !serviceWorkerNames.includes(dirName)
    })

    if (orphanedDirs.length > 0) {
      console.log(pc.yellow('Orphaned extracted workers (no matching service):'))
      for (const dir of orphanedDirs) {
        console.log(pc.yellow(`  - ${dir}`))
      }
      console.log()
      console.log(pc.dim('  These can be safely deleted if no longer needed.'))
      console.log()
    }

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
    console.log(pc.dim("Use 'cloudwerk services list' for a simple list."))
    console.log(pc.dim("Use 'cloudwerk services info <name>' for details on a specific service."))
    console.log()
  } catch (error) {
    handleCommandError(error, verbose)
  }
}
