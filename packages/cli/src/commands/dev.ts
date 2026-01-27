/**
 * @cloudwerk/cli - Dev Command
 *
 * Starts the development server.
 */

import * as path from 'node:path'
import * as fs from 'node:fs'
import * as os from 'node:os'
import { serve } from '@hono/node-server'
import {
  loadConfig,
  scanRoutes,
  buildRouteManifest,
  resolveLayouts,
  resolveMiddleware,
  resolveRoutesDir,
  hasErrors,
  formatErrors,
  formatWarnings,
} from '@cloudwerk/core'

import type { DevCommandOptions, Logger } from '../types.js'
import { CliError } from '../types.js'
import { createLogger, printStartupBanner, printError } from '../utils/logger.js'
import { createApp } from '../server/createApp.js'
import { VERSION } from '../version.js'
import { SHUTDOWN_TIMEOUT_MS } from '../constants.js'

// ============================================================================
// Dev Command
// ============================================================================

/**
 * Start the development server.
 *
 * @param pathArg - Optional working directory path
 * @param options - Command options
 */
export async function dev(
  pathArg: string | undefined,
  options: DevCommandOptions
): Promise<void> {
  const startTime = Date.now()
  const verbose = options.verbose ?? false
  const logger = createLogger(verbose)

  try {
    // Resolve working directory
    const cwd = pathArg
      ? path.resolve(process.cwd(), pathArg)
      : process.cwd()

    // Validate working directory exists
    if (!fs.existsSync(cwd)) {
      throw new CliError(
        `Directory does not exist: ${cwd}`,
        'ENOENT',
        `Make sure the path exists and try again.`
      )
    }

    logger.debug(`Working directory: ${cwd}`)

    // Load configuration
    logger.debug(`Loading configuration...`)
    const config = await loadConfig(cwd)
    logger.debug(`Config loaded: routesDir=${config.routesDir}, extensions=${config.extensions.join(', ')}`)

    // Resolve routes directory
    const routesDir = resolveRoutesDir(config, cwd)
    logger.debug(`Routes directory: ${routesDir}`)

    // Check if routes directory exists
    if (!fs.existsSync(routesDir)) {
      throw new CliError(
        `Routes directory does not exist: ${routesDir}`,
        'ENOENT',
        `Create the "${config.routesDir}" directory or update routesDir in cloudwerk.config.ts`
      )
    }

    // Scan routes
    logger.debug(`Scanning routes...`)
    const scanResult = await scanRoutes(routesDir, config)
    logger.debug(`Found ${scanResult.routes.length} route files`)

    // Build manifest
    logger.debug(`Building route manifest...`)
    const manifest = buildRouteManifest(
      scanResult,
      routesDir,
      resolveLayouts,
      resolveMiddleware
    )

    // Report validation errors
    if (hasErrors(manifest)) {
      const errorMessages = formatErrors(manifest.errors)
      logger.error(errorMessages)
      throw new CliError(
        'Route validation failed',
        'VALIDATION_ERROR',
        'Fix the errors above and try again.'
      )
    }

    // Report warnings (only if there are actual warnings)
    if (manifest.warnings.length > 0) {
      const warningMessages = formatWarnings(manifest.warnings)
      logger.warn(warningMessages)
    }

    // Check for no routes
    if (manifest.routes.length === 0) {
      logger.warn(`No routes found in ${config.routesDir}`)
      logger.warn(`Create a route.ts file to get started.`)
    }

    // Create Hono app
    logger.debug(`Creating Hono app...`)
    const { app, routes } = await createApp(manifest, scanResult, config, logger, verbose)

    // Parse port
    const port = parseInt(options.port, 10)
    if (isNaN(port) || port < 1 || port > 65535) {
      throw new CliError(
        `Invalid port: ${options.port}`,
        'INVALID_PORT',
        'Port must be a number between 1 and 65535'
      )
    }

    // Start server
    logger.debug(`Starting server on port ${port}...`)
    const host = options.host

    const server = serve({
      fetch: app.fetch,
      port,
      hostname: host,
    })

    // Handle server errors
    server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        printError(
          `Port ${port} is already in use`,
          `Try using a different port:\n    cloudwerk dev --port ${port + 1}`
        )
        process.exit(1)
      } else {
        printError(err.message)
        process.exit(1)
      }
    })

    // Wait for server to start
    await new Promise<void>((resolve) => {
      server.on('listening', resolve)
    })

    // Calculate startup time
    const startupTime = Date.now() - startTime

    // Build URLs
    const localUrl = `http://${host === '0.0.0.0' ? 'localhost' : host}:${port}/`
    const networkUrl = host === '0.0.0.0' ? getNetworkUrl(port) : undefined

    // Print startup banner
    printStartupBanner(
      VERSION,
      localUrl,
      networkUrl,
      routes.map((r) => ({ method: r.method, pattern: r.pattern })),
      startupTime
    )

    // Handle graceful shutdown
    setupGracefulShutdown(server, logger)
  } catch (error) {
    if (error instanceof CliError) {
      printError(error.message, error.suggestion)
      process.exit(1)
    }

    if (error instanceof Error) {
      printError(error.message)
      if (verbose && error.stack) {
        console.log(error.stack)
      }
      process.exit(1)
    }

    printError(String(error))
    process.exit(1)
  }
}

// ============================================================================
// Network URL
// ============================================================================

/**
 * Get the network URL for the server.
 *
 * @param port - Server port
 * @returns Network URL or undefined if not available
 */
function getNetworkUrl(port: number): string | undefined {
  const interfaces = os.networkInterfaces()

  for (const name of Object.keys(interfaces)) {
    const iface = interfaces[name]
    if (!iface) continue

    for (const alias of iface) {
      if (alias.family === 'IPv4' && !alias.internal) {
        return `http://${alias.address}:${port}/`
      }
    }
  }

  return undefined
}

// ============================================================================
// Graceful Shutdown
// ============================================================================

/**
 * Set up graceful shutdown handlers.
 *
 * @param server - HTTP server instance
 * @param logger - Logger instance
 */
function setupGracefulShutdown(
  server: ReturnType<typeof serve>,
  logger: Logger
): void {
  const shutdown = () => {
    console.log() // New line after ^C
    logger.info('Shutting down...')
    server.close(() => {
      logger.info('Server closed')
      process.exit(0)
    })

    // Force exit after timeout
    setTimeout(() => {
      logger.warn('Forcing shutdown...')
      process.exit(0)
    }, SHUTDOWN_TIMEOUT_MS)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}
