/**
 * @cloudwerk/cli - Services Info Command
 *
 * Display detailed information about a specific service.
 */

import pc from 'picocolors'
import { loadConfig, scanServices, buildServiceManifest } from '@cloudwerk/core/build'
import { createLogger } from '../../utils/logger.js'
import { handleCommandError } from '../../utils/command-error-handler.js'
import { CliError } from '../../types.js'

// ============================================================================
// Types
// ============================================================================

export interface ServicesInfoOptions {
  /** Enable verbose output */
  verbose?: boolean
  /** Output format */
  format?: 'text' | 'json'
}

// ============================================================================
// Info Command
// ============================================================================

/**
 * Display detailed information about a specific service.
 */
export async function servicesInfo(
  serviceName: string,
  options: ServicesInfoOptions = {}
): Promise<void> {
  const verbose = options.verbose ?? false
  const format = options.format ?? 'text'
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

    if (format === 'json') {
      console.log(JSON.stringify(service, null, 2))
      return
    }

    // Text output
    console.log()
    console.log(pc.bold(`Service: ${service.name}`))
    console.log()

    // Basic info
    console.log(pc.dim('  Location:     ') + service.filePath)
    console.log(pc.dim('  Mode:         ') + (service.mode === 'extracted' ? pc.yellow('extracted') : pc.green('local')))
    console.log(pc.dim('  Binding:      ') + service.bindingName)
    console.log(pc.dim('  Worker Name:  ') + service.workerName)
    console.log(pc.dim('  Entrypoint:   ') + service.entrypointClass)
    console.log()

    // Methods
    console.log(pc.dim('  Methods:'))
    if (service.methodNames.length > 0) {
      for (const method of service.methodNames) {
        console.log(`    - ${pc.cyan(method)}()`)
      }
    } else {
      console.log(pc.dim('    (methods will be detected after service is loaded)'))
    }
    console.log()

    // Bindings
    console.log(pc.dim('  Required Bindings:'))
    if (service.requiredBindings.length > 0) {
      for (const binding of service.requiredBindings) {
        console.log(`    - ${binding}`)
      }
    } else {
      console.log(pc.dim('    none configured'))
    }
    console.log()

    // Hooks
    console.log(pc.dim('  Hooks:        ') + (service.hasHooks ? pc.green('yes') : pc.dim('no')))
    console.log()

    // Actions based on mode
    if (service.mode === 'local') {
      console.log(pc.dim('Actions:'))
      console.log(pc.dim(`  Extract:  cloudwerk services extract ${serviceName}`))
    } else {
      console.log(pc.dim('Actions:'))
      console.log(pc.dim(`  Inline:   cloudwerk services inline ${serviceName}`))
      console.log(pc.dim(`  Deploy:   cloudwerk services deploy ${serviceName}`))
    }
    console.log()
  } catch (error) {
    handleCommandError(error, verbose)
  }
}
