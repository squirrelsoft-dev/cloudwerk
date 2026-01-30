/**
 * @cloudwerk/cli - Services Deploy Command
 *
 * Deploy an extracted service to Cloudflare.
 */

import * as path from 'node:path'
import { spawn } from 'node:child_process'
import pc from 'picocolors'
import { loadConfig, scanServices, buildServiceManifest } from '@cloudwerk/core/build'
import { createLogger } from '../../utils/logger.js'
import { handleCommandError } from '../../utils/command-error-handler.js'
import { CliError } from '../../types.js'
import { serviceWorkerExists, getExtractedDir } from '../../utils/service-worker-generator.js'

// ============================================================================
// Types
// ============================================================================

export interface ServicesDeployOptions {
  /** Enable verbose output */
  verbose?: boolean
  /** Dry run - show what would be done without deploying */
  dryRun?: boolean
}

// ============================================================================
// Deploy Command
// ============================================================================

/**
 * Deploy an extracted service to Cloudflare.
 *
 * This command runs wrangler deploy in the extracted service's directory.
 */
export async function servicesDeploy(
  serviceName: string,
  options: ServicesDeployOptions = {}
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

    // Check if extracted
    const hasExtracted = serviceWorkerExists(cwd, serviceName)
    if (!hasExtracted) {
      throw new CliError(
        `Service '${serviceName}' is not extracted`,
        'EINVAL',
        `Run 'cloudwerk services extract ${serviceName}' first.`
      )
    }

    const workerDir = path.join(getExtractedDir(cwd), service.workerName)

    console.log()
    console.log(pc.bold(`Deploying service: ${serviceName}`))
    console.log()
    console.log(pc.dim(`  Worker:   ${service.workerName}`))
    console.log(pc.dim(`  Location: ${workerDir}`))
    console.log()

    if (dryRun) {
      console.log(pc.yellow('Dry run - would run:'))
      console.log(`  cd ${workerDir} && wrangler deploy`)
      console.log()
      return
    }

    // Run wrangler deploy
    console.log(pc.dim('Running wrangler deploy...'))
    console.log()

    await new Promise<void>((resolve, reject) => {
      const wrangler = spawn('wrangler', ['deploy'], {
        cwd: workerDir,
        stdio: 'inherit',
        shell: true,
      })

      wrangler.on('close', (code) => {
        if (code === 0) {
          resolve()
        } else {
          reject(new CliError(
            `wrangler deploy failed with code ${code}`,
            'EEXEC',
            'Check the output above for details.'
          ))
        }
      })

      wrangler.on('error', (err) => {
        reject(new CliError(
          `Failed to run wrangler: ${err.message}`,
          'EEXEC',
          'Make sure wrangler is installed: npm install -g wrangler'
        ))
      })
    })

    console.log()
    console.log(pc.green(`Service '${serviceName}' deployed successfully!`))
    console.log()
    console.log(pc.dim('Next steps:'))
    console.log(pc.dim('  1. Deploy your main worker to use the service binding:'))
    console.log()
    console.log('     cloudwerk deploy')
    console.log()
  } catch (error) {
    handleCommandError(error, verbose)
  }
}
