/**
 * @cloudwerk/cli - Services Inline Command
 *
 * Convert an extracted service back to local mode.
 */

import pc from 'picocolors'
import { loadConfig, scanServices, buildServiceManifest } from '@cloudwerk/core/build'
import { createLogger } from '../../utils/logger.js'
import { handleCommandError } from '../../utils/command-error-handler.js'
import { CliError } from '../../types.js'
import { deleteServiceWorker, serviceWorkerExists } from '../../utils/service-worker-generator.js'
import { removeServiceWrangler } from '../../utils/service-wrangler.js'
import { generateServiceTypes } from '../../utils/service-type-generator.js'

// ============================================================================
// Types
// ============================================================================

export interface ServicesInlineOptions {
  /** Enable verbose output */
  verbose?: boolean
  /** Force removal without confirmation */
  force?: boolean
}

// ============================================================================
// Inline Command
// ============================================================================

/**
 * Convert an extracted service back to local mode.
 *
 * This command:
 * 1. Removes the extracted worker files from .cloudwerk/extracted/<name>/
 * 2. Removes the service binding from wrangler.toml
 * 3. Updates type definitions
 */
export async function servicesInline(
  serviceName: string,
  options: ServicesInlineOptions = {}
): Promise<void> {
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

    // Build manifest with the service marked as local
    const manifest = buildServiceManifest(scanResult, appDir, {
      defaultMode: 'local',
    })

    // Find the service
    const service = manifest.services.find((s) => s.name === serviceName)

    if (!service) {
      const available = manifest.services.map((s) => s.name)
      throw new CliError(
        `Service '${serviceName}' not found`,
        'ENOENT',
        available.length > 0
          ? `Available services: ${available.join(', ')}`
          : 'No services found in app/services/'
      )
    }

    console.log()
    console.log(pc.bold(`Converting service to local mode: ${serviceName}`))
    console.log()

    // Check if extracted worker exists
    const hasExtracted = serviceWorkerExists(cwd, serviceName)

    // Remove extracted worker files
    if (hasExtracted) {
      logger.debug('Removing extracted worker files...')
      const deleted = deleteServiceWorker(cwd, serviceName)
      if (deleted) {
        console.log(`  ${pc.green('\u2713')} Removed extracted worker files`)
      }
    } else {
      console.log(`  ${pc.dim('\u2713')} No extracted worker files to remove`)
    }

    // Remove service binding from wrangler.toml
    logger.debug('Updating wrangler.toml...')
    const removed = removeServiceWrangler(cwd)
    if (removed) {
      console.log(`  ${pc.green('\u2713')} Removed service binding from wrangler.toml`)
    } else {
      console.log(`  ${pc.dim('\u2713')} No service binding to remove`)
    }

    // Update type definitions
    logger.debug('Updating type definitions...')
    const typesResult = generateServiceTypes(cwd, manifest)
    console.log(`  ${pc.green('\u2713')} Types updated: ${typesResult.file}`)

    console.log()
    console.log(pc.green(`Service '${serviceName}' is now running in local mode.`))
    console.log()
    console.log(pc.dim('The service will be called directly within your main Worker.'))
    console.log(pc.dim('Deploy your main Worker to apply the changes:'))
    console.log()
    console.log('  cloudwerk deploy')
    console.log()
  } catch (error) {
    handleCommandError(error, verbose)
  }
}
