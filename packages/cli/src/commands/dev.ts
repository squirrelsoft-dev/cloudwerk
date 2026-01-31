/**
 * @cloudwerk/cli - Dev Command
 *
 * Starts the development server using Vite.
 */

import * as path from 'node:path'
import * as fs from 'node:fs'
import * as os from 'node:os'
import { createServer, mergeConfig as mergeViteConfig, type InlineConfig, type PluginOption } from 'vite'
import devServer from '@hono/vite-dev-server'
import cloudflareAdapter from '@hono/vite-dev-server/cloudflare'
import cloudwerk from '@cloudwerk/vite-plugin'
import { loadConfig } from '@cloudwerk/core'

import type { DevCommandOptions, Logger } from '../types.js'
import { CliError } from '../types.js'
import { createLogger, printStartupBanner, printError } from '../utils/logger.js'
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

    // Parse port
    const port = parseInt(options.port, 10)
    if (isNaN(port) || port < 1 || port > 65535) {
      throw new CliError(
        `Invalid port: ${options.port}`,
        'INVALID_PORT',
        'Port must be a number between 1 and 65535'
      )
    }

    // Load cloudwerk config
    const config = await loadConfig(cwd)
    logger.debug(`Loaded cloudwerk config`)

    // Build base Vite config
    const baseViteConfig: InlineConfig = {
      root: cwd,
      mode: 'development',
      server: {
        port,
        host: options.host,
        strictPort: true,
      },
      plugins: [
        cloudwerk({
          verbose,
        }),
        devServer({
          adapter: cloudflareAdapter,
          entry: 'virtual:cloudwerk/server-entry',
        }),
      ],
      // Suppress Vite's default startup message - we'll print our own
      logLevel: verbose ? 'info' : 'warn',
      clearScreen: false,
    }

    // Merge user's vite config if provided
    // User plugins are prepended so they run before cloudwerk plugins
    let viteConfig: InlineConfig = baseViteConfig
    if (config.vite) {
      const userPlugins = config.vite.plugins as PluginOption[] | undefined
      const { plugins: _, ...userConfigWithoutPlugins } = config.vite

      // Merge non-plugin config
      viteConfig = mergeViteConfig(baseViteConfig, userConfigWithoutPlugins)

      // Prepend user plugins before our plugins
      if (userPlugins) {
        viteConfig.plugins = [...userPlugins, ...(baseViteConfig.plugins ?? [])]
      }
    }

    logger.debug(`Starting Vite dev server...`)

    // Create and start Vite server
    const server = await createServer(viteConfig)
    await server.listen()

    // Get server info
    const resolvedPort = server.config.server.port ?? port
    const resolvedHost = server.config.server.host === true
      ? '0.0.0.0'
      : (server.config.server.host ?? 'localhost')

    // Build URLs
    const localHost = resolvedHost === '0.0.0.0' ? 'localhost' : resolvedHost
    const localUrl = `http://${localHost}:${resolvedPort}/`
    const networkUrl = resolvedHost === '0.0.0.0' ? getNetworkUrl(resolvedPort) : undefined

    // Calculate startup time
    const startupTime = Date.now() - startTime

    // Extract routes from the manifest (if available)
    const routes: Array<{ method: string; pattern: string }> = []

    // Import the manifest to get route info
    try {
      const manifestModule = await server.ssrLoadModule('virtual:cloudwerk/manifest')
      const manifest = manifestModule.default
      if (manifest?.routes) {
        for (const route of manifest.routes) {
          if (route.fileType === 'page') {
            routes.push({ method: 'GET', pattern: route.urlPattern })
          } else if (route.fileType === 'route') {
            // For API routes, we don't know the methods without loading the module
            // Just show GET for now - Vite will handle the actual methods
            routes.push({ method: 'ALL', pattern: route.urlPattern })
          }
        }
      }
    } catch {
      // Manifest not available yet, that's ok
      logger.debug('Could not load route manifest for startup banner')
    }

    // Print startup banner
    printStartupBanner(
      VERSION,
      localUrl,
      networkUrl,
      routes,
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
      // Check for port in use error
      if ((error as NodeJS.ErrnoException).code === 'EADDRINUSE') {
        const port = parseInt(options.port, 10)
        printError(
          `Port ${port} is already in use`,
          `Try using a different port:\n    cloudwerk dev --port ${port + 1}`
        )
        process.exit(1)
      }

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
 * @param server - Vite dev server instance
 * @param logger - Logger instance
 */
function setupGracefulShutdown(
  server: Awaited<ReturnType<typeof createServer>>,
  logger: Logger
): void {
  const shutdown = async () => {
    console.log() // New line after ^C
    logger.info('Shutting down...')
    await server.close()
    logger.info('Server closed')
    process.exit(0)
  }

  // Force exit after timeout
  const forceShutdown = () => {
    setTimeout(() => {
      logger.warn('Forcing shutdown...')
      process.exit(0)
    }, SHUTDOWN_TIMEOUT_MS)
  }

  process.on('SIGINT', async () => {
    forceShutdown()
    await shutdown()
  })

  process.on('SIGTERM', async () => {
    forceShutdown()
    await shutdown()
  })
}
