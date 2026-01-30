/**
 * @cloudwerk/cli - Services Extract Command
 *
 * Extract a service to run as a separate Worker.
 */

import pc from 'picocolors'
import { loadConfig, scanServices, buildServiceManifest } from '@cloudwerk/core/build'
import { createLogger } from '../../utils/logger.js'
import { handleCommandError } from '../../utils/command-error-handler.js'
import { CliError } from '../../types.js'
import { generateServiceWorker } from '../../utils/service-worker-generator.js'
import { generateServiceWrangler } from '../../utils/service-wrangler.js'
import { generateServiceTypes } from '../../utils/service-type-generator.js'

// ============================================================================
// Types
// ============================================================================

export interface ServicesExtractOptions {
  /** Enable verbose output */
  verbose?: boolean
  /** Dry run - show what would be done without making changes */
  dryRun?: boolean
}

// ============================================================================
// Extract Command
// ============================================================================

/**
 * Extract a service to run as a separate Worker.
 *
 * This command:
 * 1. Generates a WorkerEntrypoint wrapper in .cloudwerk/extracted/<name>/
 * 2. Generates a wrangler.toml for the extracted worker
 * 3. Updates the main wrangler.toml with service bindings
 * 4. Updates type definitions
 */
export async function servicesExtract(
  serviceName: string,
  options: ServicesExtractOptions = {}
): Promise<void> {
  const verbose = options.verbose ?? false
  const dryRun = options.dryRun ?? false
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

    // Build manifest with the service marked as extracted
    const serviceModes: Record<string, 'extracted'> = { [serviceName]: 'extracted' }
    const manifest = buildServiceManifest(scanResult, appDir, {
      defaultMode: 'local',
      serviceModes,
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
    console.log(pc.bold(`Extracting service: ${serviceName}`))
    console.log()

    if (dryRun) {
      console.log(pc.yellow('Dry run - no changes will be made'))
      console.log()
    }

    // Generate WorkerEntrypoint wrapper
    logger.debug('Generating WorkerEntrypoint wrapper...')
    const workerResult = generateServiceWorker(cwd, service, { includeTimestamp: true })

    console.log(`  ${pc.green('\u2713')} Worker generated: ${workerResult.workerFile}`)
    console.log(`  ${pc.green('\u2713')} Wrangler config: ${workerResult.wranglerFile}`)

    // Update main wrangler.toml with service binding
    if (!dryRun) {
      logger.debug('Updating wrangler.toml with service binding...')
      const wranglerResult = generateServiceWrangler(cwd, manifest)

      if (wranglerResult.changed) {
        console.log(`  ${pc.green('\u2713')} Service binding added to ${wranglerResult.wranglerPath}`)
      }
    }

    // Update type definitions
    if (!dryRun) {
      logger.debug('Updating type definitions...')
      const typesResult = generateServiceTypes(cwd, manifest)
      console.log(`  ${pc.green('\u2713')} Types updated: ${typesResult.file}`)
    }

    console.log()

    // Show next steps
    console.log(pc.bold('Next steps:'))
    console.log()
    console.log(pc.dim(`  1. Review the generated files in .cloudwerk/extracted/${service.workerName}/`))
    console.log(pc.dim(`  2. Update the wrangler.toml with your binding configurations`))
    console.log(pc.dim(`  3. Deploy the extracted service:`))
    console.log()
    console.log(`     cloudwerk services deploy ${serviceName}`)
    console.log()
    console.log(pc.dim(`  4. Deploy the main worker to use the service binding:`))
    console.log()
    console.log('     cloudwerk deploy')
    console.log()
  } catch (error) {
    handleCommandError(error, verbose)
  }
}
